-- Update validate_stock_transaction function to bypass stock validation for special order products
CREATE OR REPLACE FUNCTION public.validate_stock_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_category TEXT;
BEGIN
  -- Verificar se há stock suficiente para vendas
  IF TG_TABLE_NAME = 'sale_items' AND TG_OP = 'INSERT' THEN
    -- Get product category
    SELECT category INTO product_category 
    FROM public.products 
    WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id;
    
    -- Skip stock validation for special order products
    IF product_category = 'encomenda_especial' THEN
      RETURN NEW;
    END IF;
    
    -- Normal stock validation for other products
    IF (SELECT quantity FROM public.products WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para o produto. Stock disponível: %', 
        (SELECT quantity FROM public.products WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;