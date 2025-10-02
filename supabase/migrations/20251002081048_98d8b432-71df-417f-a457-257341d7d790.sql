-- Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  CONSTRAINT unique_category_per_tenant UNIQUE (tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Users can view own tenant categories"
  ON public.product_categories
  FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Administrators can insert own tenant categories"
  ON public.product_categories
  FOR INSERT
  WITH CHECK (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

CREATE POLICY "Administrators can update own tenant categories"
  ON public.product_categories
  FOR UPDATE
  USING (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

CREATE POLICY "Administrators can delete own tenant categories"
  ON public.product_categories
  FOR DELETE
  USING (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

-- Add trigger for updated_at
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_product_categories_tenant_id ON public.product_categories(tenant_id);