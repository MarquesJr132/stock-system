-- Add 'gerente' role to the user_role enum
ALTER TYPE user_role ADD VALUE 'gerente';

-- Update the is_administrator function to include gerente
CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'superuser', 'gerente') FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;

-- Create function to check if user is gerente
CREATE OR REPLACE FUNCTION public.is_gerente()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role = 'gerente' FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;

-- Update products policies to allow gerente access
DROP POLICY IF EXISTS "Users can insert own tenant products" ON public.products;
CREATE POLICY "Users can insert own tenant products" 
ON public.products 
FOR INSERT 
WITH CHECK (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

DROP POLICY IF EXISTS "Users can update own tenant products" ON public.products;
CREATE POLICY "Users can update own tenant products" 
ON public.products 
FOR UPDATE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

DROP POLICY IF EXISTS "Users can delete own tenant products" ON public.products;
CREATE POLICY "Users can delete own tenant products" 
ON public.products 
FOR DELETE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Update customers policies
DROP POLICY IF EXISTS "Users can delete own tenant customers" ON public.customers;
CREATE POLICY "Users can delete own tenant customers" 
ON public.customers 
FOR DELETE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Update sales policies  
DROP POLICY IF EXISTS "Users can update own tenant sales" ON public.sales;
CREATE POLICY "Users can update own tenant sales" 
ON public.sales 
FOR UPDATE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Update profiles policies - gerente can view tenant users but cannot create/update them
DROP POLICY IF EXISTS "Administrators can create tenant users" ON public.profiles;
CREATE POLICY "Administrators can create tenant users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_administrator() AND (role = 'user'::user_role) AND (tenant_id = get_current_user_tenant()));

DROP POLICY IF EXISTS "Administrators can update tenant users" ON public.profiles;
CREATE POLICY "Administrators can update tenant users" 
ON public.profiles 
FOR UPDATE 
USING (is_administrator() AND ((COALESCE(tenant_id, id) = get_current_user_tenant()) OR (user_id = auth.uid())));

-- Add policy for gerente to view users but not modify
CREATE POLICY "Gerente can view tenant users" 
ON public.profiles 
FOR SELECT 
USING (is_gerente() AND ((COALESCE(tenant_id, id) = get_current_user_tenant()) OR (user_id = auth.uid())));

-- Update company settings policies
DROP POLICY IF EXISTS "Administrators can insert own tenant company settings" ON public.company_settings;
CREATE POLICY "Administrators can insert own tenant company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

DROP POLICY IF EXISTS "Administrators can update own tenant company settings" ON public.company_settings;
CREATE POLICY "Administrators can update own tenant company settings" 
ON public.company_settings 
FOR UPDATE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));