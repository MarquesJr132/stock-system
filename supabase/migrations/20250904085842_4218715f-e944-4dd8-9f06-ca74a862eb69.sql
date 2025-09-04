-- Create trigger to automatically calculate monthly statistics at month end
CREATE OR REPLACE FUNCTION public.auto_generate_monthly_stats()
RETURNS VOID AS $$
DECLARE
  tenant_record RECORD;
  current_month TEXT;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(CURRENT_DATE, 'YYYY-MM');
  
  -- Generate statistics for all tenants
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    PERFORM public.calculate_monthly_statistics(tenant_record.tenant_id, current_month);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also ensure we have current month data for existing tenants
SELECT public.auto_generate_monthly_stats();