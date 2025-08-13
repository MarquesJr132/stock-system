-- Reabilitar RLS em todas as tabelas e criar políticas simples sem recursão
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas que podem ter recursão
DROP POLICY IF EXISTS "Users can view own tenant company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Administrators can insert own tenant company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Administrators can update own tenant company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Administrators can view own tenant limits" ON public.tenant_limits;
DROP POLICY IF EXISTS "Superuser full access to tenant limits" ON public.tenant_limits;
DROP POLICY IF EXISTS "Users can view own tenant data usage" ON public.data_usage_log;
DROP POLICY IF EXISTS "Superuser full access to data usage log" ON public.data_usage_log;

-- Criar políticas simples baseadas em tenant_id direto (sem funções recursivas)

-- Company Settings
CREATE POLICY "Tenant access to company settings" ON public.company_settings
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Products
CREATE POLICY "Tenant access to products" ON public.products
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Sales
CREATE POLICY "Tenant access to sales" ON public.sales
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Sale Items
CREATE POLICY "Tenant access to sale items" ON public.sale_items
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Customers
CREATE POLICY "Tenant access to customers" ON public.customers
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Service role continua com acesso total (para edge functions)
CREATE POLICY "Service role full access - company_settings" ON public.company_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - products" ON public.products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - sales" ON public.sales
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - sale_items" ON public.sale_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - customers" ON public.customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);