-- Create monthly statistics table for tracking historical data
CREATE TABLE public.monthly_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- Format: "2024-01" for January 2024
  total_stock INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, month_year)
);

-- Enable RLS on monthly_statistics
ALTER TABLE public.monthly_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_statistics
CREATE POLICY "Users can view own tenant monthly statistics" 
ON public.monthly_statistics 
FOR SELECT 
USING (tenant_id = get_current_user_tenant());

CREATE POLICY "System can insert monthly statistics" 
ON public.monthly_statistics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update monthly statistics" 
ON public.monthly_statistics 
FOR UPDATE 
USING (true);

-- Function to calculate and store monthly statistics
CREATE OR REPLACE FUNCTION public.calculate_monthly_statistics(target_tenant_id UUID, target_month TEXT)
RETURNS VOID AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  stock_count INTEGER := 0;
  stock_value NUMERIC := 0;
  customer_count INTEGER := 0;
  total_profit NUMERIC := 0;
  total_sales_amount NUMERIC := 0;
BEGIN
  -- Parse month_year to get date range
  month_start := (target_month || '-01')::DATE;
  month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Calculate total stock (current state)
  SELECT 
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(purchase_price * quantity), 0)
  INTO stock_count, stock_value
  FROM public.products 
  WHERE tenant_id = target_tenant_id 
    AND category != 'encomenda_especial';
  
  -- Calculate customers registered in this month
  SELECT COUNT(*) INTO customer_count
  FROM public.customers 
  WHERE tenant_id = target_tenant_id 
    AND created_at::DATE BETWEEN month_start AND month_end;
  
  -- Calculate sales and profit for this month
  SELECT 
    COALESCE(SUM(total_profit), 0),
    COALESCE(SUM(total_amount), 0)
  INTO total_profit, total_sales_amount
  FROM public.sales 
  WHERE tenant_id = target_tenant_id 
    AND created_at::DATE BETWEEN month_start AND month_end;
  
  -- Insert or update the record
  INSERT INTO public.monthly_statistics (
    tenant_id, 
    month_year, 
    total_stock, 
    total_value, 
    total_customers, 
    total_profit, 
    total_sales
  ) VALUES (
    target_tenant_id,
    target_month,
    stock_count,
    stock_value,
    customer_count,
    total_profit,
    total_sales_amount
  )
  ON CONFLICT (tenant_id, month_year) 
  DO UPDATE SET 
    total_stock = EXCLUDED.total_stock,
    total_value = EXCLUDED.total_value,
    total_customers = EXCLUDED.total_customers,
    total_profit = EXCLUDED.total_profit,
    total_sales = EXCLUDED.total_sales,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get percentage changes
CREATE OR REPLACE FUNCTION public.get_percentage_change(
  current_value NUMERIC,
  previous_value NUMERIC
) RETURNS TEXT AS $$
BEGIN
  IF previous_value = 0 OR previous_value IS NULL THEN
    IF current_value > 0 THEN
      RETURN 'N/A';
    ELSE
      RETURN '0%';
    END IF;
  END IF;
  
  RETURN ROUND(((current_value - previous_value) / previous_value) * 100, 1) || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;