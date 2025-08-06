-- Drop policies that depend on functions, then recreate with secure functions
DROP POLICY IF EXISTS "Superusers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can create administrators" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can create users in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can delete administrators" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can delete users in their tenant" ON public.profiles;

-- Now drop and recreate functions
DROP FUNCTION IF EXISTS public.has_role(user_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_profile(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE;

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(check_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(tenant_id, id) FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Recreate RLS policies with secure functions
CREATE POLICY "Superusers can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (public.has_role('superuser'));

CREATE POLICY "Administrators can view tenant profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  public.has_role('administrator') AND 
  (user_id = auth.uid() OR tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Superusers can create administrators" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('superuser') AND 
  role = 'administrator' AND 
  tenant_id IS NULL AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Administrators can create users in their tenant" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('administrator') AND 
  role = 'user' AND 
  tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Superusers can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (public.has_role('superuser'));

CREATE POLICY "Superusers can delete administrators" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (public.has_role('superuser') AND role = 'administrator');

CREATE POLICY "Administrators can delete users in their tenant" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
  public.has_role('administrator') AND 
  tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);