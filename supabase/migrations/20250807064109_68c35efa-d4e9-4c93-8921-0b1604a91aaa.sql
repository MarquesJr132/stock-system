-- Fix tenant isolation: Each administrator should be their own tenant
-- Update existing administrators to have their own tenant_id (use their profile id as tenant_id)
UPDATE public.profiles 
SET tenant_id = id, updated_at = NOW()
WHERE role = 'administrator' AND tenant_id IS NULL;

-- Create a trigger to automatically set tenant_id for new administrators
CREATE OR REPLACE FUNCTION public.set_administrator_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If this is an administrator being created, set their tenant_id to their own id
  IF NEW.role = 'administrator' AND NEW.tenant_id IS NULL THEN
    NEW.tenant_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS set_administrator_tenant_trigger ON public.profiles;
CREATE TRIGGER set_administrator_tenant_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_administrator_tenant();

-- Re-enable RLS with proper tenant-based policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create tenant-aware policies
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles  
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Administrators can view profiles in their tenant
CREATE POLICY "Administrators can view tenant profiles" ON public.profiles
FOR SELECT TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'administrator'
    AND (
      -- Admin can see their own profile
      user_id = auth.uid() 
      -- Admin can see users in their tenant
      OR tenant_id = admin_profile.tenant_id
    )
  )
);

-- Administrators can create users in their tenant only
CREATE POLICY "Administrators can create tenant users" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'administrator'
    AND tenant_id = admin_profile.tenant_id
    AND role = 'user'
  )
);

-- Superusers can do everything
CREATE POLICY "Superusers full access" ON public.profiles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles super_profile
    WHERE super_profile.user_id = auth.uid() 
    AND super_profile.role = 'superuser'
  )
);