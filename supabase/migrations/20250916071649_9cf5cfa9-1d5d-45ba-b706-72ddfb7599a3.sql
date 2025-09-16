-- Fix customer data security by updating RLS policies
-- Drop the overly permissive policies first
DROP POLICY IF EXISTS "Tenant access to customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own tenant customers" ON public.customers;

-- Create more secure policies that require authentication AND tenant membership

-- Select policy: Users can only view customers from their own tenant
CREATE POLICY "Authenticated users can view own tenant customers" 
ON public.customers 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_user_tenant()
);

-- Insert policy: Users can only create customers for their own tenant
CREATE POLICY "Authenticated users can create own tenant customers" 
ON public.customers 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_user_tenant()
);

-- Update policy: Users can only update customers from their own tenant
CREATE POLICY "Authenticated users can update own tenant customers" 
ON public.customers 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_user_tenant()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_user_tenant()
);

-- Delete policy: Only administrators and managers can delete customers from their tenant
CREATE POLICY "Admin users can delete own tenant customers" 
ON public.customers 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (is_administrator() OR is_gerente() OR is_superuser()) 
  AND tenant_id = get_current_user_tenant()
);