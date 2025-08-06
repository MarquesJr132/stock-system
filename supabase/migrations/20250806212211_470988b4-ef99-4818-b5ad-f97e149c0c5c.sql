-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('superuser', 'administrator', 'user');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  tenant_id UUID NULL, -- null for superuser, references admin's profile id for regular users
  created_by UUID NULL REFERENCES public.profiles(id), -- who created this user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(check_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = check_role
  );
$$;

-- Create function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(tenant_id, id) FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS Policies for profiles
-- Superusers can see all profiles
CREATE POLICY "Superusers can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (public.has_role('superuser'));

-- Administrators can see their own profile and profiles in their tenant
CREATE POLICY "Administrators can view tenant profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  public.has_role('administrator') AND 
  (user_id = auth.uid() OR tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Insert policies
CREATE POLICY "Superusers can create administrators" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('superuser') AND 
  role = 'administrator' AND 
  tenant_id IS NULL AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Administrators can create users in their tenant" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  public.has_role('administrator') AND 
  role = 'user' AND 
  tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Users can only insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Update policies
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Superusers can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (public.has_role('superuser'));

-- Delete policies  
CREATE POLICY "Superusers can delete administrators" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (public.has_role('superuser') AND role = 'administrator');

CREATE POLICY "Administrators can delete users in their tenant" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
  public.has_role('administrator') AND 
  tenant_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial superuser (you'll need to sign up first, then update this)
-- This will be updated after first signup