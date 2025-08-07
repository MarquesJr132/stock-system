-- Função para sincronizar contadores com dados existentes
CREATE OR REPLACE FUNCTION public.sync_tenant_counters(tenant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_users INTEGER := 0;
  existing_data INTEGER := 0;
  current_month_start DATE;
BEGIN
  -- Calcular início do mês atual
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Contar usuários existentes criados este mês
  SELECT COUNT(*) INTO existing_users
  FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role = 'user'
    AND created_at >= current_month_start;
  
  -- Contar dados existentes criados este mês (produtos + vendas + clientes)
  SELECT 
    COALESCE(product_count, 0) + COALESCE(sale_count, 0) + COALESCE(customer_count, 0)
  INTO existing_data
  FROM (
    SELECT 
      (SELECT COUNT(*) FROM public.products WHERE tenant_id = tenant_uuid AND created_at >= current_month_start) as product_count,
      (SELECT COUNT(*) FROM public.sales WHERE tenant_id = tenant_uuid AND created_at >= current_month_start) as sale_count,
      (SELECT COUNT(*) FROM public.customers WHERE tenant_id = tenant_uuid AND created_at >= current_month_start) as customer_count
  ) counts;
  
  -- Atualizar ou inserir registro de limites
  INSERT INTO public.tenant_limits (
    tenant_id, 
    current_month_users, 
    current_month_usage,
    created_by,
    limit_period_start
  ) 
  VALUES (
    tenant_uuid, 
    existing_users, 
    existing_data,
    tenant_uuid,
    current_month_start
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    current_month_users = existing_users,
    current_month_usage = existing_data,
    limit_period_start = current_month_start,
    updated_at = NOW();
    
END;
$$;

-- Função para sincronizar todos os tenants
CREATE OR REPLACE FUNCTION public.sync_all_tenant_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Buscar todos os administradores únicos
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    PERFORM public.sync_tenant_counters(tenant_record.tenant_id);
  END LOOP;
END;
$$;

-- Executar sincronização inicial
SELECT public.sync_all_tenant_counters();

-- Adicionar constraint unique no tenant_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenant_limits_tenant_id_key'
  ) THEN
    ALTER TABLE public.tenant_limits 
    ADD CONSTRAINT tenant_limits_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;