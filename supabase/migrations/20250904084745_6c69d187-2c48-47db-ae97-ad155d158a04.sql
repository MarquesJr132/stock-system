-- CORREÇÃO 1: Tornar tenant_id obrigatório em profiles
ALTER TABLE public.profiles 
ALTER COLUMN tenant_id SET NOT NULL;

-- CORREÇÃO 2: Adicionar constraints de validação de stock
CREATE OR REPLACE FUNCTION public.validate_stock_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se há stock suficiente para vendas
  IF TG_TABLE_NAME = 'sale_items' AND TG_OP = 'INSERT' THEN
    IF (SELECT quantity FROM public.products WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para o produto. Stock disponível: %', 
        (SELECT quantity FROM public.products WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger de validação de stock
CREATE TRIGGER validate_stock_before_sale
  BEFORE INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_stock_transaction();

-- CORREÇÃO 3: Função para atualização atômica de stock
CREATE OR REPLACE FUNCTION public.atomic_stock_update(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Lock da linha do produto para evitar race conditions
  SELECT quantity INTO current_stock 
  FROM public.products 
  WHERE id = p_product_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  new_stock := current_stock + p_quantity_change;
  
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente. Stock atual: %, Tentativa de reduzir: %', current_stock, ABS(p_quantity_change);
  END IF;
  
  UPDATE public.products 
  SET quantity = new_stock, updated_at = NOW()
  WHERE id = p_product_id AND tenant_id = p_tenant_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CORREÇÃO 4: Melhorar políticas RLS para dados sensíveis
DROP POLICY IF EXISTS "Tenant access to customers" ON public.customers;
CREATE POLICY "Strict tenant access to customers" 
ON public.customers 
FOR ALL 
USING (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = customers.tenant_id
  )
)
WITH CHECK (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = customers.tenant_id
  )
);

-- CORREÇÃO 5: Política mais restritiva para produtos
DROP POLICY IF EXISTS "Tenant access to products" ON public.products;
CREATE POLICY "Strict tenant access to products" 
ON public.products 
FOR ALL 
USING (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = products.tenant_id
  )
)
WITH CHECK (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = products.tenant_id
  )
);

-- CORREÇÃO 6: Política mais restritiva para vendas
DROP POLICY IF EXISTS "Tenant access to sales" ON public.sales;
CREATE POLICY "Strict tenant access to sales" 
ON public.sales 
FOR ALL 
USING (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = sales.tenant_id
  )
)
WITH CHECK (
  tenant_id = get_current_user_tenant() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND tenant_id = sales.tenant_id
  )
);

-- CORREÇÃO 7: Triggers de auditoria para operações críticas
CREATE TRIGGER audit_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_sales_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_customers_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- CORREÇÃO 8: Função para validar tenant consistency
CREATE OR REPLACE FUNCTION public.validate_tenant_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o tenant_id é consistente com o usuário atual
  IF NEW.tenant_id != get_current_user_tenant() THEN
    RAISE EXCEPTION 'Violação de isolamento de tenant: tentativa de acesso a dados de outro tenant';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar validação de tenant em todas as tabelas críticas
CREATE TRIGGER validate_tenant_products
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

CREATE TRIGGER validate_tenant_customers
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

CREATE TRIGGER validate_tenant_sales
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

-- CORREÇÃO 9: Constraint para evitar tenant_id nulo em profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tenant_id_not_null 
CHECK (tenant_id IS NOT NULL OR role = 'superuser');

-- CORREÇÃO 10: Função para mascarar dados sensíveis em logs
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data_json JSONB)
RETURNS JSONB AS $$
BEGIN
  -- Mascarar campos sensíveis como emails, telefones, NIUTs
  RETURN jsonb_set(
    jsonb_set(
      jsonb_set(
        data_json,
        '{email}',
        to_jsonb(
          CASE 
            WHEN data_json->>'email' IS NOT NULL 
            THEN regexp_replace(data_json->>'email', '(.{2}).*(@.*)', '\1***\2')
            ELSE NULL
          END
        )
      ),
      '{phone}',
      to_jsonb(
        CASE 
          WHEN data_json->>'phone' IS NOT NULL 
          THEN regexp_replace(data_json->>'phone', '(.{3}).*(.{3})', '\1***\2')
          ELSE NULL
        END
      )
    ),
    '{nuit}',
    to_jsonb(
      CASE 
        WHEN data_json->>'nuit' IS NOT NULL 
        THEN regexp_replace(data_json->>'nuit', '(.{3}).*(.{3})', '\1***\2')
        ELSE NULL
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;