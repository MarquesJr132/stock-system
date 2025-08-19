-- Remove supplier_id from special_orders and add delivery_date
ALTER TABLE public.special_orders 
DROP COLUMN supplier_id,
DROP COLUMN product_name,
DROP COLUMN product_description,
DROP COLUMN quantity,
DROP COLUMN unit_price;

-- Create special_order_items table for multiple products per order
CREATE TABLE public.special_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  special_order_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for special_order_items
ALTER TABLE public.special_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for special_order_items
CREATE POLICY "Users can view own tenant special order items" 
ON public.special_order_items 
FOR SELECT 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can insert own tenant special order items" 
ON public.special_order_items 
FOR INSERT 
WITH CHECK (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can update own tenant special order items" 
ON public.special_order_items 
FOR UPDATE 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Administrators can delete own tenant special order items" 
ON public.special_order_items 
FOR DELETE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Add trigger for updated_at
CREATE TRIGGER update_special_order_items_updated_at
BEFORE UPDATE ON public.special_order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();