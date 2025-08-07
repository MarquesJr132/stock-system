-- Criar tabela para definir limites por tenant
CREATE TABLE public.tenant_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  monthly_data_limit INTEGER NOT NULL DEFAULT 1000,
  current_month_usage INTEGER NOT NULL DEFAULT 0,
  limit_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_limits
CREATE POLICY "Superuser full access to tenant limits" 
ON public.tenant_limits 
FOR ALL 
USING (is_superuser());

CREATE POLICY "Administrators can view own tenant limits" 
ON public.tenant_limits 
FOR SELECT 
USING (is_administrator() AND tenant_id = get_current_user_tenant());

-- Criar tabela para rastrear uso de dados
CREATE TABLE public.data_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  data_type TEXT NOT NULL, -- 'product', 'sale', 'customer', etc.
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.data_usage_log ENABLE ROW LEVEL SECURITY;

-- Create policies for data_usage_log
CREATE POLICY "Superuser full access to data usage log" 
ON public.data_usage_log 
FOR ALL 
USING (is_superuser());

CREATE POLICY "Users can view own tenant data usage" 
ON public.data_usage_log 
FOR SELECT 
USING (tenant_id = get_current_user_tenant());

-- Create trigger to update timestamps
CREATE TRIGGER update_tenant_limits_updated_at
  BEFORE UPDATE ON public.tenant_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar função para resetar contadores mensais
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenant_limits 
  SET 
    current_month_usage = 0,
    limit_period_start = CURRENT_DATE,
    updated_at = NOW()
  WHERE limit_period_start < (CURRENT_DATE - INTERVAL '1 month');
END;
$$;

-- Criar função para verificar e atualizar limites
CREATE OR REPLACE FUNCTION public.check_data_limit(tenant_uuid UUID, data_type_param TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Buscar limite atual
  SELECT monthly_data_limit, current_month_usage 
  INTO current_limit, current_usage
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, criar um padrão
  IF NOT FOUND THEN
    INSERT INTO public.tenant_limits (tenant_id, created_by) 
    VALUES (tenant_uuid, tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais dados
  IF current_usage >= current_limit THEN
    RETURN false;
  END IF;
  
  -- Incrementar uso se for criação
  IF data_type_param = 'create' THEN
    UPDATE public.tenant_limits 
    SET current_month_usage = current_month_usage + 1
    WHERE tenant_id = tenant_uuid;
  END IF;
  
  RETURN true;
END;
$$;

-- Criar função para registrar uso de dados
CREATE OR REPLACE FUNCTION public.log_data_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_name TEXT;
  action_type TEXT;
  tenant_uuid UUID;
BEGIN
  -- Determinar o tipo de ação
  IF TG_OP = 'INSERT' THEN
    action_type = 'create';
    tenant_uuid = NEW.tenant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type = 'update';
    tenant_uuid = NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    action_type = 'delete';
    tenant_uuid = OLD.tenant_id;
  END IF;
  
  -- Obter nome da tabela
  table_name = TG_TABLE_NAME;
  
  -- Registrar uso apenas para criações
  IF action_type = 'create' THEN
    INSERT INTO public.data_usage_log (tenant_id, data_type, action_type, created_by)
    VALUES (tenant_uuid, table_name, action_type, 
      CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.created_by
        WHEN TG_OP = 'UPDATE' THEN NEW.created_by
        ELSE OLD.created_by
      END);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Criar triggers para rastrear uso de dados
CREATE TRIGGER log_products_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_data_usage();

CREATE TRIGGER log_customers_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.log_data_usage();

CREATE TRIGGER log_sales_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.log_data_usage();