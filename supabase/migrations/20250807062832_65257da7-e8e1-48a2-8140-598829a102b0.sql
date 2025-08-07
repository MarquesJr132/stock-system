-- COMPLETELY REMOVE ALL PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "Administrators can create users in their tenant only" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can delete users in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can create administrators only" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can delete administrators" ON public.profiles;

-- Temporarily disable RLS to stop the recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;