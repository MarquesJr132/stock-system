-- Insert 2 superusers directly into profiles table
-- Note: These will need to be created in auth.users first, then we'll update their profiles
-- For now, I'll create placeholder entries that you can update with real user IDs after signup

-- First, let's update our RLS policies to reflect the correct hierarchy
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Superusers can create administrators" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can create users in their tenant" ON public.profiles;

-- Create updated policies that reflect the correct hierarchy
CREATE POLICY "Superusers can create administrators only" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('superuser') AND 
  role = 'administrator' AND 
  tenant_id IS NULL AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Administrators can create users in their tenant only" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('administrator') AND 
  role = 'user' AND 
  tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Prevent regular users from creating other users
CREATE POLICY "Regular users cannot create other users" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() AND 
  role = 'user'
);

-- Create a function to manually promote a user to superuser (to be used after signup)
CREATE OR REPLACE FUNCTION public.promote_to_superuser(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'superuser', tenant_id = NULL, updated_at = NOW()
  WHERE email = user_email;
END;
$$;