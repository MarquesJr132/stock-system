-- Corrigir security warnings adicionando search_path às funções
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.check_data_limit(tenant_uuid UUID, data_type_param TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.log_data_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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