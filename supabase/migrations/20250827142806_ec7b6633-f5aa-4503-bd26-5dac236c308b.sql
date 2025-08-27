-- Restrict email updates for all users
-- Users should not be able to change their email addresses

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can update tenant user profiles" ON public.profiles;

-- Create new restrictive policies that prevent email changes
CREATE POLICY "Users can update own profile (no email changes)" ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND (OLD.email = NEW.email) -- Prevent email changes
);

-- Administrators can update tenant user profiles but not emails or admin profiles
CREATE POLICY "Administrators can update tenant user profiles (restricted)" ON public.profiles
FOR UPDATE 
USING (
  (get_current_user_role() = 'superuser'::user_role) 
  OR (
    (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'gerente'::user_role])) 
    AND (COALESCE(tenant_id, id) = get_current_user_tenant()) 
    AND (role = 'user'::user_role) -- Can only update regular users, not admins/managers
    AND (user_id != auth.uid()) -- Cannot update own profile through this policy
  )
)
WITH CHECK (
  (get_current_user_role() = 'superuser'::user_role) 
  OR (
    (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'gerente'::user_role])) 
    AND (COALESCE(tenant_id, id) = get_current_user_tenant()) 
    AND (role = 'user'::user_role)
    AND (OLD.email = NEW.email) -- Prevent email changes
    AND (OLD.role = NEW.role) -- Prevent role changes for non-superusers
    AND (user_id != auth.uid())
  )
);