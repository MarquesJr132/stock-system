-- Fix infinite recursion by removing problematic policies and creating simpler ones
DROP POLICY IF EXISTS "Superusers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can update all profiles" ON public.profiles;

-- Create a simple function to check superuser status without recursion
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'superuser'
  );
$$;

-- Recreate superuser policies using the function
CREATE POLICY "Superusers can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_superuser());

CREATE POLICY "Superusers can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_superuser());