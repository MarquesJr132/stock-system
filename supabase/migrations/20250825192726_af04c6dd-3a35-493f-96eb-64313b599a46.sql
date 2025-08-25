-- Fix security vulnerabilities in profiles table RLS policies

-- Drop the dangerous hardcoded superuser policy
DROP POLICY IF EXISTS "Specific superuser can view all" ON public.profiles;

-- Drop overly broad policies and recreate with proper restrictions
DROP POLICY IF EXISTS "Superuser full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile simple" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile simple" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile simple" ON public.profiles;

-- Create secure policies that only allow access to own profile
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow superusers to manage profiles but only through proper role checking
CREATE POLICY "Superusers can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN get_current_user_role() = 'superuser' THEN true
    ELSE user_id = auth.uid()
  END
)
WITH CHECK (
  CASE 
    WHEN get_current_user_role() = 'superuser' THEN true
    ELSE user_id = auth.uid()
  END
);

-- Administrators can view profiles in their tenant for user management
CREATE POLICY "Administrators can view tenant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_current_user_role() = 'superuser' OR
  user_id = auth.uid() OR
  (
    get_current_user_role() IN ('administrator', 'gerente') AND
    COALESCE(tenant_id, id) = get_current_user_tenant()
  )
);

-- Administrators can update profiles in their tenant (but not change critical fields)
CREATE POLICY "Administrators can update tenant user profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_current_user_role() = 'superuser' OR
  user_id = auth.uid() OR
  (
    get_current_user_role() IN ('administrator', 'gerente') AND
    COALESCE(tenant_id, id) = get_current_user_tenant() AND
    role = 'user'  -- Can only modify regular users, not other admins
  )
);