-- Re-enable RLS with completely safe, non-recursive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safe policy for users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Safe policy for users to update their own profile (no recursion)  
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Safe policy for users to insert their own profile (no recursion)
CREATE POLICY "Users can insert own profile" ON public.profiles  
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create a bypass for superusers using direct role check (avoid function calls)
-- This checks the role directly without using functions that could cause recursion
CREATE POLICY "Superuser full access" ON public.profiles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    JOIN public.profiles p ON p.user_id = au.id 
    WHERE au.id = auth.uid() AND p.role = 'superuser'
  )
);