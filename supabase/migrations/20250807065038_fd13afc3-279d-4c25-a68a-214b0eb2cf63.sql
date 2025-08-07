-- Fix search path security warnings for the functions we just created
-- This ensures the functions are secure and cannot be hijacked by schema manipulation

-- Update get_current_user_role function with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- Update get_current_user_tenant function with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT COALESCE(tenant_id, id) FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- Update is_superuser function with proper search path
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'superuser' FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

-- Update is_administrator function with proper search path
CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'superuser') FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';