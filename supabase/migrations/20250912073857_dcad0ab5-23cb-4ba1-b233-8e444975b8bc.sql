-- Add missing current_month_users column to tenant_limits table
ALTER TABLE public.tenant_limits 
ADD COLUMN IF NOT EXISTS current_month_users integer NOT NULL DEFAULT 0;

-- Update the increment_user_count function to handle both counters
CREATE OR REPLACE FUNCTION public.increment_user_count(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tenant_limits 
  SET 
    current_month_users = current_month_users + 1,
    current_total_users = current_total_users + 1,
    updated_at = NOW()
  WHERE tenant_id = tenant_uuid;
  
  RETURN true;
END;
$function$;

-- Update the reset_monthly_usage function to properly reset monthly counters
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tenant_limits 
  SET 
    current_month_usage = 0,
    current_month_users = 0,
    current_month_space_usage_mb = 0,
    limit_period_start = CURRENT_DATE,
    updated_at = NOW()
  WHERE limit_period_start < (CURRENT_DATE - INTERVAL '1 month');
END;
$function$;