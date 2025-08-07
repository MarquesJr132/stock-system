-- Create tenant-aware RLS policies for all inventory tables

-- Products table policies
CREATE POLICY "Users can view own tenant products" ON public.products
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own tenant products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own tenant products" ON public.products
FOR UPDATE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own tenant products" ON public.products
FOR DELETE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Customers table policies
CREATE POLICY "Users can view own tenant customers" ON public.customers
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own tenant customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own tenant customers" ON public.customers
FOR UPDATE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own tenant customers" ON public.customers
FOR DELETE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Sales table policies
CREATE POLICY "Users can view own tenant sales" ON public.sales
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own tenant sales" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own tenant sales" ON public.sales
FOR UPDATE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Sale items table policies
CREATE POLICY "Users can view own tenant sale_items" ON public.sale_items
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own tenant sale_items" ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own tenant sale_items" ON public.sale_items
FOR UPDATE TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);