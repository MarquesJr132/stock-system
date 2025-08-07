-- Drop existing superuser policies with exact names
DROP POLICY IF EXISTS "Superusers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can update all profiles" ON public.profiles;

-- Drop the old function
DROP FUNCTION IF EXISTS public.is_superuser();

-- Create the new simpler function
CREATE OR REPLACE FUNCTION public.current_user_is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'superuser'
    LIMIT 1
  );
$$;

-- Create new superuser policies with different names
CREATE POLICY "Superuser view access" ON public.profiles
FOR SELECT TO authenticated
USING (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superuser update access" ON public.profiles  
FOR UPDATE TO authenticated
USING (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superuser insert access" ON public.profiles
FOR INSERT TO authenticated  
WITH CHECK (current_user_is_superuser() OR user_id = auth.uid());

CREATE POLICY "Superuser delete admins" ON public.profiles
FOR DELETE TO authenticated
USING (current_user_is_superuser() AND role = 'administrator');