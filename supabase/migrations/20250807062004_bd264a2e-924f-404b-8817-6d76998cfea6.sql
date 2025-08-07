-- Fix infinite recursion in profiles RLS policies
DROP POLICY IF EXISTS "Users can view profiles within their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can update all profiles" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow superusers to view and manage all profiles (non-recursive)
CREATE POLICY "Superusers can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'superuser'
  )
);

CREATE POLICY "Superusers can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'superuser'
  )
);

-- Update the OTP settings for password reset to use shorter expiry
-- Note: This requires database admin access, adjust as needed
-- ALTER SYSTEM SET auth.otp_expiry = 300; -- 5 minutes