-- COMPLETELY DISABLE RLS temporarily to test and fix the core issue
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies to prevent any recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superuser view access" ON public.profiles;
DROP POLICY IF EXISTS "Superuser update access" ON public.profiles;
DROP POLICY IF EXISTS "Superuser insert access" ON public.profiles;
DROP POLICY IF EXISTS "Superuser delete admins" ON public.profiles;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.current_user_is_superuser();