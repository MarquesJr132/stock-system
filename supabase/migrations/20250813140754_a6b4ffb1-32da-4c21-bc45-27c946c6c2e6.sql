-- Criar uma função para sincronizar contadores de um tenant específico
CREATE OR REPLACE FUNCTION public.sync_tenant_data_usage(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_month_start DATE;
  data_count INTEGER := 0;
  user_count INTEGER := 0;
BEGIN
  -- Calcular início do mês atual
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Contar dados criados este mês (produtos + vendas + clientes)
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM public.products WHERE tenant_id = tenant_uuid AND created_at >= current_month_start) +
      (SELECT COUNT(*) FROM public.sales WHERE tenant_id = tenant_uuid AND created_at >= current_month_start) +
      (SELECT COUNT(*) FROM public.customers WHERE tenant_id = tenant_uuid AND created_at >= current_month_start)
    , 0)
  INTO data_count;
  
  -- Contar usuários criados este mês
  SELECT COUNT(*) INTO user_count
  FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role = 'user'
    AND created_at >= current_month_start;
  
  -- Atualizar ou inserir o registro de limites
  INSERT INTO public.tenant_limits (
    tenant_id, 
    current_month_usage, 
    current_month_users,
    limit_period_start,
    created_by
  ) 
  VALUES (
    tenant_uuid, 
    data_count,
    user_count,
    current_month_start,
    tenant_uuid
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    current_month_usage = EXCLUDED.current_month_usage,
    current_month_users = EXCLUDED.current_month_users,
    limit_period_start = current_month_start,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced tenant % - Data: %, Users: %', tenant_uuid, data_count, user_count;
END;
$function$;