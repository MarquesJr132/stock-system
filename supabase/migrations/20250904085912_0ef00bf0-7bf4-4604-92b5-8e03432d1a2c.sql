-- Fix the ambiguous column reference in calculate_monthly_statistics function
CREATE OR REPLACE FUNCTION public.calculate_monthly_statistics(target_tenant_id UUID, target_month TEXT)
RETURNS VOID AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  stock_count INTEGER := 0;
  stock_value NUMERIC := 0;
  customer_count INTEGER := 0;
  month_profit NUMERIC := 0;
  month_sales_amount NUMERIC := 0;
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
  
  -- Calculate sales and profit for this month (renamed variables to avoid ambiguity)
  SELECT 
    COALESCE(SUM(s.total_profit), 0),
    COALESCE(SUM(s.total_amount), 0)
  INTO month_profit, month_sales_amount
  FROM public.sales s
  WHERE s.tenant_id = target_tenant_id 
    AND s.created_at::DATE BETWEEN month_start AND month_end;
  
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
    month_profit,
    month_sales_amount
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

-- Now create the auto-generation function
CREATE OR REPLACE FUNCTION public.auto_generate_monthly_stats()
RETURNS VOID AS $$
DECLARE
  tenant_record RECORD;
  current_month TEXT;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(CURRENT_DATE, 'YYYY-MM');
  
  -- Generate statistics for all tenants
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    PERFORM public.calculate_monthly_statistics(tenant_record.tenant_id, current_month);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate current month data for existing tenants
SELECT public.auto_generate_monthly_stats();