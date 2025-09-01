-- Create quotations table for managing quotations separately from sales
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id UUID,
  total_amount NUMERIC NOT NULL,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  total_vat_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  valid_until DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create policies for quotations
CREATE POLICY "Users can view own tenant quotations" 
ON public.quotations 
FOR SELECT 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can insert own tenant quotations" 
ON public.quotations 
FOR INSERT 
WITH CHECK (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Administrators can update own tenant quotations" 
ON public.quotations 
FOR UPDATE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

CREATE POLICY "Administrators can delete own tenant quotations" 
ON public.quotations 
FOR DELETE 
USING (is_superuser() OR ((is_administrator() OR is_gerente()) AND (tenant_id = get_current_user_tenant())));

-- Create quotation_items table
CREATE TABLE public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  includes_vat BOOLEAN NOT NULL DEFAULT false,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for quotation_items
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Create policies for quotation_items
CREATE POLICY "Users can view own tenant quotation items" 
ON public.quotation_items 
FOR SELECT 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can insert own tenant quotation items" 
ON public.quotation_items 
FOR INSERT 
WITH CHECK (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can update own tenant quotation items" 
ON public.quotation_items 
FOR UPDATE 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Users can delete own tenant quotation items" 
ON public.quotation_items 
FOR DELETE 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();