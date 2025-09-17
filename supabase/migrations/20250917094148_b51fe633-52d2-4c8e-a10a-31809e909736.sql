-- Remove dashboard features from regular users
DELETE FROM public.tenant_features 
WHERE feature_code IN ('dashboard_full', 'dashboard_basic') 
AND tenant_id IN (
  SELECT DISTINCT COALESCE(tenant_id, id) 
  FROM public.profiles 
  WHERE role = 'user'
);

-- Ensure dashboard features are only for admin roles
-- This prevents future assignments to regular users
CREATE OR REPLACE FUNCTION public.validate_dashboard_feature_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Check if this is a dashboard feature
  IF NEW.feature_code IN ('dashboard_full', 'dashboard_basic') THEN
    -- Get the role of the tenant admin
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE COALESCE(tenant_id, id) = NEW.tenant_id 
      AND role IN ('administrator', 'superuser', 'gerente')
    LIMIT 1;
    
    -- If no admin role found, prevent assignment
    IF user_role IS NULL THEN
      RAISE EXCEPTION 'Dashboard features can only be assigned to tenants with administrative roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate dashboard feature assignments
DROP TRIGGER IF EXISTS validate_dashboard_features ON public.tenant_features;
CREATE TRIGGER validate_dashboard_features
  BEFORE INSERT OR UPDATE ON public.tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dashboard_feature_assignment();