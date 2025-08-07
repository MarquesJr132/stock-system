-- Fix infinite recursion in RLS policies by creating security definer functions
-- and updating the problematic policies

-- Drop all existing problematic policies on profiles table
DROP POLICY IF EXISTS "Regular users cannot create other users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superuser full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can create tenant users" ON public.profiles;
DROP POLICY IF EXISTS "Superusers full access" ON public.profiles;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT COALESCE(tenant_id, id) FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'superuser' FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'superuser') FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create clean RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Superuser can do everything
CREATE POLICY "Superuser full access" ON public.profiles
FOR ALL TO authenticated
USING (public.is_superuser());

-- Administrators can view users in their tenant
CREATE POLICY "Administrators can view tenant users" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.is_administrator() AND 
  (COALESCE(tenant_id, id) = public.get_current_user_tenant() OR user_id = auth.uid())
);

-- Administrators can create users in their tenant
CREATE POLICY "Administrators can create tenant users" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_administrator() AND 
  role = 'user' AND 
  tenant_id = public.get_current_user_tenant()
);

-- Administrators can update users in their tenant (except role changes)
CREATE POLICY "Administrators can update tenant users" ON public.profiles
FOR UPDATE TO authenticated
USING (
  public.is_administrator() AND 
  (COALESCE(tenant_id, id) = public.get_current_user_tenant() OR user_id = auth.uid())
);