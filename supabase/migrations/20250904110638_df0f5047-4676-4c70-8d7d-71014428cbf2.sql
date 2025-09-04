-- Function to clean up orphaned tenant limits
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_tenant_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete tenant_limits records where tenant_id doesn't exist in profiles
  DELETE FROM public.tenant_limits 
  WHERE tenant_id NOT IN (
    SELECT DISTINCT COALESCE(tenant_id, id) 
    FROM public.profiles 
    WHERE role = 'administrator'
  );
  
  RAISE NOTICE 'Cleaned up orphaned tenant limits records';
END;
$function$