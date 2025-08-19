-- Create special_orders table
CREATE TABLE public.special_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  advance_payment NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tenant special orders"
ON public.special_orders
FOR SELECT
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can insert own tenant special orders"
ON public.special_orders
FOR INSERT
WITH CHECK (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can update own tenant special orders"
ON public.special_orders
FOR UPDATE
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Administrators can delete own tenant special orders"
ON public.special_orders
FOR DELETE
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Create trigger for updated_at
CREATE TRIGGER update_special_orders_updated_at
BEFORE UPDATE ON public.special_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger
CREATE TRIGGER special_orders_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.special_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_event();