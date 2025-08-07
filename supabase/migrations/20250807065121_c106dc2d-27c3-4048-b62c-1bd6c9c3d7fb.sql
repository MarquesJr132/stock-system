-- Update inventory table RLS policies to use the new security definer functions
-- This ensures proper tenant isolation and prevents recursion issues

-- Drop existing policies that might cause issues
DROP POLICY IF EXISTS "Users can view own tenant products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own tenant products" ON public.products;
DROP POLICY IF EXISTS "Users can update own tenant products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own tenant products" ON public.products;

DROP POLICY IF EXISTS "Users can view own tenant customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own tenant customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own tenant customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own tenant customers" ON public.customers;

DROP POLICY IF EXISTS "Users can view own tenant sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert own tenant sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own tenant sales" ON public.sales;

DROP POLICY IF EXISTS "Users can view own tenant sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can insert own tenant sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can update own tenant sale_items" ON public.sale_items;

-- Create clean RLS policies for products table
CREATE POLICY "Users can view own tenant products" ON public.products
FOR SELECT TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can insert own tenant products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superuser() OR 
  (public.is_administrator() AND tenant_id = public.get_current_user_tenant())
);

CREATE POLICY "Users can update own tenant products" ON public.products
FOR UPDATE TO authenticated
USING (
  public.is_superuser() OR 
  (public.is_administrator() AND tenant_id = public.get_current_user_tenant())
);

CREATE POLICY "Users can delete own tenant products" ON public.products
FOR DELETE TO authenticated
USING (
  public.is_superuser() OR 
  (public.is_administrator() AND tenant_id = public.get_current_user_tenant())
);

-- Create clean RLS policies for customers table
CREATE POLICY "Users can view own tenant customers" ON public.customers
FOR SELECT TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can insert own tenant customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can update own tenant customers" ON public.customers
FOR UPDATE TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can delete own tenant customers" ON public.customers
FOR DELETE TO authenticated
USING (
  public.is_superuser() OR 
  (public.is_administrator() AND tenant_id = public.get_current_user_tenant())
);

-- Create clean RLS policies for sales table
CREATE POLICY "Users can view own tenant sales" ON public.sales
FOR SELECT TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can insert own tenant sales" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can update own tenant sales" ON public.sales
FOR UPDATE TO authenticated
USING (
  public.is_superuser() OR 
  (public.is_administrator() AND tenant_id = public.get_current_user_tenant())
);

-- Create clean RLS policies for sale_items table
CREATE POLICY "Users can view own tenant sale_items" ON public.sale_items
FOR SELECT TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can insert own tenant sale_items" ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);

CREATE POLICY "Users can update own tenant sale_items" ON public.sale_items
FOR UPDATE TO authenticated
USING (
  public.is_superuser() OR 
  tenant_id = public.get_current_user_tenant()
);