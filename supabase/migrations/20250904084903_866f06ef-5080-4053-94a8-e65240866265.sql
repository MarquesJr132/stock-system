-- CONTINUAÇÃO DA IMPLEMENTAÇÃO DO PLANO DE SEGURANÇA

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
DROP TRIGGER IF EXISTS validate_stock_before_sale ON public.sale_items;
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

-- CORREÇÃO 4: Triggers de auditoria para operações críticas
DROP TRIGGER IF EXISTS audit_products_changes ON public.products;
CREATE TRIGGER audit_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_sales_changes ON public.sales;
CREATE TRIGGER audit_sales_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_customers_changes ON public.customers;
CREATE TRIGGER audit_customers_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- CORREÇÃO 5: Função para validar tenant consistency
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
DROP TRIGGER IF EXISTS validate_tenant_products ON public.products;
CREATE TRIGGER validate_tenant_products
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

DROP TRIGGER IF EXISTS validate_tenant_customers ON public.customers;
CREATE TRIGGER validate_tenant_customers
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

DROP TRIGGER IF EXISTS validate_tenant_sales ON public.sales;
CREATE TRIGGER validate_tenant_sales
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_consistency();

-- CORREÇÃO 6: Função para mascarar dados sensíveis em logs
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