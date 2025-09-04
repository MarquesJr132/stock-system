-- Update sync_tenant_data_usage function to count all data, not just current month
CREATE OR REPLACE FUNCTION public.sync_tenant_data_usage(tenant_uuid uuid, count_all_data boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE;
  data_count INTEGER := 0;
  user_count INTEGER := 0;
  date_filter_condition TEXT;
BEGIN
  -- Calcular início do mês atual
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Determinar se deve contar todos os dados ou apenas do mês atual
  IF count_all_data THEN
    date_filter_condition := '';
  ELSE
    date_filter_condition := ' AND created_at >= ''' || current_month_start || '''';
  END IF;
  
  -- Contar dados (produtos + vendas + clientes)
  EXECUTE format('
    SELECT 
      COALESCE(
        (SELECT COUNT(*) FROM public.products WHERE tenant_id = %L %s) +
        (SELECT COUNT(*) FROM public.sales WHERE tenant_id = %L %s) +
        (SELECT COUNT(*) FROM public.customers WHERE tenant_id = %L %s)
      , 0)',
    tenant_uuid, date_filter_condition,
    tenant_uuid, date_filter_condition,
    tenant_uuid, date_filter_condition
  ) INTO data_count;
  
  -- Contar usuários
  IF count_all_data THEN
    SELECT COUNT(*) INTO user_count
    FROM public.profiles 
    WHERE tenant_id = tenant_uuid 
      AND role = 'user';
  ELSE
    SELECT COUNT(*) INTO user_count
    FROM public.profiles 
    WHERE tenant_id = tenant_uuid 
      AND role = 'user'
      AND created_at >= current_month_start;
  END IF;
  
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
    limit_period_start = CASE 
      WHEN count_all_data THEN tenant_limits.limit_period_start
      ELSE current_month_start
    END,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced tenant % - Data: %, Users: % (count_all: %)', tenant_uuid, data_count, user_count, count_all_data;
END;
$function$;

-- Add function to sync all tenants with total data count
CREATE OR REPLACE FUNCTION public.sync_all_tenants_total_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Buscar todos os administradores únicos (tenants)
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id, email
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    BEGIN
      PERFORM public.sync_tenant_data_usage(tenant_record.tenant_id, true);
      synced_count := synced_count + 1;
      RAISE NOTICE 'Synced tenant % (%)', tenant_record.tenant_id, tenant_record.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to sync tenant % (%): %', tenant_record.tenant_id, tenant_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total data sync completed for % tenants', synced_count;
END;
$function$;