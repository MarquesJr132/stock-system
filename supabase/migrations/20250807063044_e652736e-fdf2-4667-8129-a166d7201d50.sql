-- Fix the superuser policy - the previous one was too complex and causing issues
DROP POLICY IF EXISTS "Superuser full access" ON public.profiles;

-- Create a simpler, working superuser policy
-- First, create a direct function to check if current user is superuser
CREATE OR REPLACE FUNCTION public.current_user_is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Direct check without complex joins to avoid recursion
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'superuser'
    LIMIT 1
  );
$$;

-- Create superuser policies using the function
CREATE POLICY "Superusers can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superusers can update all profiles" ON public.profiles  
FOR UPDATE TO authenticated
USING (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superusers can insert all profiles" ON public.profiles
FOR INSERT TO authenticated  
WITH CHECK (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superusers can delete administrators" ON public.profiles
FOR DELETE TO authenticated
USING (current_user_is_superuser() AND role = 'administrator');