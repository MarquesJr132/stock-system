-- Rename columns to be more accurate (from monthly to total users)
ALTER TABLE public.tenant_limits 
RENAME COLUMN monthly_user_limit TO total_user_limit;

ALTER TABLE public.tenant_limits 
RENAME COLUMN current_month_users TO current_total_users;

-- Update the sync_tenant_space_usage function to count ALL users, not just this month
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
  -- Calculate start of current month (still needed for other operations)
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Count ALL users in the tenant (not just this month)
  SELECT COUNT(*) INTO user_count
  FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role IN ('user', 'gerente', 'administrator');
  
  -- Estimate space usage
  SELECT public.estimate_tenant_space_usage(tenant_uuid) INTO space_usage_mb;
  
  -- Update or insert the tenant limits record
  INSERT INTO public.tenant_limits (
    tenant_id, 
    current_total_users,
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
    current_total_users = user_count,
    current_month_space_usage_mb = space_usage_mb,
    limit_period_start = current_month_start,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced tenant % - Total Users: %, Space: %MB', 
    tenant_uuid, user_count, space_usage_mb;
END;
$function$;

-- Update the sync_tenant_data_usage function as well
CREATE OR REPLACE FUNCTION public.sync_tenant_data_usage(tenant_uuid uuid, count_all_data boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Simply call the updated space-focused sync function
  PERFORM public.sync_tenant_space_usage(tenant_uuid);
  
  RAISE NOTICE 'Synced tenant % using optimized space and total user calculation', tenant_uuid;
END;
$function$;

-- Update the get_tenant_limits_with_admin_info function to use new column names
CREATE OR REPLACE FUNCTION public.get_tenant_limits_with_admin_info()
 RETURNS TABLE(id uuid, tenant_id uuid, monthly_data_limit integer, total_user_limit integer, monthly_space_limit_mb integer, current_month_usage integer, current_total_users integer, current_month_space_usage_mb numeric, limit_period_start date, created_at timestamp with time zone, updated_at timestamp with time zone, admin_email text, admin_full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tl.id,
    tl.tenant_id,
    tl.monthly_data_limit,
    tl.total_user_limit,
    COALESCE(tl.monthly_space_limit_mb, 500) as monthly_space_limit_mb,
    tl.current_month_usage,
    tl.current_total_users,
    COALESCE(tl.current_month_space_usage_mb, 0) as current_month_space_usage_mb,
    tl.limit_period_start,
    tl.created_at,
    tl.updated_at,
    p.email as admin_email,
    p.full_name as admin_full_name
  FROM public.tenant_limits tl
  INNER JOIN public.profiles p ON (COALESCE(p.tenant_id, p.id) = tl.tenant_id)
  WHERE p.role = 'administrator'
  ORDER BY p.full_name;
END;
$function$;

-- Update the check_user_limit function to use new column name
CREATE OR REPLACE FUNCTION public.check_user_limit(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_limit INTEGER;
  current_user_count INTEGER;
BEGIN
  -- Get current user limit and count
  SELECT total_user_limit, current_total_users 
  INTO current_user_limit, current_user_count
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- If no record exists, create default and allow
  IF NOT FOUND THEN
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    RETURN true;
  END IF;
  
  -- Check if can create more users (if already at limit, return false)
  IF current_user_count >= current_user_limit THEN
    RAISE NOTICE 'User limit exceeded for tenant %. Current: %, Limit: %', tenant_uuid, current_user_count, current_user_limit;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Update the initialize_tenant_limits function to use new column names
CREATE OR REPLACE FUNCTION public.initialize_tenant_limits(tenant_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default limits if they don't exist
  INSERT INTO public.tenant_limits (
    tenant_id,
    monthly_data_limit,
    total_user_limit,
    monthly_space_limit_mb,
    current_month_usage,
    current_total_users,
    current_month_space_usage_mb,
    created_by,
    limit_period_start
  ) 
  VALUES (
    tenant_uuid,
    1000, -- default data limit
    10,   -- default total user limit
    500,  -- default space limit (500MB)
    0,    -- initial usage zero
    0,    -- initial users zero
    0,    -- initial space zero
    tenant_uuid,
    date_trunc('month', CURRENT_DATE)::DATE
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    monthly_space_limit_mb = COALESCE(tenant_limits.monthly_space_limit_mb, 500),
    current_month_space_usage_mb = COALESCE(tenant_limits.current_month_space_usage_mb, 0),
    total_user_limit = COALESCE(tenant_limits.total_user_limit, 10),
    current_total_users = COALESCE(tenant_limits.current_total_users, 0);
  
  RAISE NOTICE 'Initialized default limits for tenant: %', tenant_uuid;
END;
$function$;