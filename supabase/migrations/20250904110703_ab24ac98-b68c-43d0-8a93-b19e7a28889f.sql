-- Function to get tenant limits with administrator details
CREATE OR REPLACE FUNCTION public.get_tenant_limits_with_admin_info()
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  monthly_data_limit integer,
  monthly_user_limit integer,
  current_month_usage integer,
  current_month_users integer,
  limit_period_start date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  admin_email text,
  admin_full_name text
)
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
    tl.monthly_user_limit,
    tl.current_month_usage,
    tl.current_month_users,
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
$function$