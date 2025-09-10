-- Optimize tenant limits system to focus on space and users
-- Remove dependency on monthly data limits

-- Update space estimation config with more accurate values
UPDATE public.tenant_limits 
SET space_estimation_config = '{
  "product_avg_size_bytes": 512,
  "customer_avg_size_bytes": 256,
  "sale_avg_size_bytes": 128,
  "sale_item_avg_size_bytes": 64,
  "quotation_avg_size_bytes": 128,
  "quotation_item_avg_size_bytes": 64,
  "special_order_avg_size_bytes": 128,
  "supplier_avg_size_bytes": 256,
  "purchase_order_avg_size_bytes": 128
}'::jsonb
WHERE space_estimation_config IS NULL OR space_estimation_config = '{}';

-- Create optimized sync function that focuses on space usage only
CREATE OR REPLACE FUNCTION public.sync_tenant_space_usage(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE;
  user_count INTEGER := 0;
  space_usage_mb NUMERIC := 0;
BEGIN
  -- Calculate start of current month
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Count users created this month
  SELECT COUNT(*) INTO user_count
  FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role = 'user'
    AND created_at >= current_month_start;
  
  -- Estimate space usage
  SELECT public.estimate_tenant_space_usage(tenant_uuid) INTO space_usage_mb;
  
  -- Update or insert the tenant limits record
  INSERT INTO public.tenant_limits (
    tenant_id, 
    current_month_users,
    current_month_space_usage_mb,
    limit_period_start,
    created_by
  ) 
  VALUES (
    tenant_uuid, 
    user_count,
    space_usage_mb,
    current_month_start,
    tenant_uuid
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    current_month_users = EXCLUDED.current_month_users,
    current_month_space_usage_mb = space_usage_mb,
    limit_period_start = current_month_start,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced tenant % - Users: %, Space: %MB', 
    tenant_uuid, user_count, space_usage_mb;
END;
$function$;

-- Update main sync function to use the new space-focused approach
CREATE OR REPLACE FUNCTION public.sync_tenant_data_usage(tenant_uuid uuid, count_all_data boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simply call the new space-focused sync function
  PERFORM public.sync_tenant_space_usage(tenant_uuid);
  
  RAISE NOTICE 'Synced tenant % using optimized space calculation', tenant_uuid;
END;
$function$;

-- Update sync all tenants function
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
  -- Find all unique administrators (tenants)
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id, email
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    BEGIN
      PERFORM public.sync_tenant_space_usage(tenant_record.tenant_id);
      synced_count := synced_count + 1;
      RAISE NOTICE 'Synced tenant % (%)', tenant_record.tenant_id, tenant_record.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to sync tenant % (%): %', tenant_record.tenant_id, tenant_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Space usage sync completed for % tenants', synced_count;
END;
$function$;