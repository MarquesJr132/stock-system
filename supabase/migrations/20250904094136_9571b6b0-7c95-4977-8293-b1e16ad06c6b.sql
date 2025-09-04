-- Fix function search path issues for security
CREATE OR REPLACE FUNCTION update_payment_analytics()
RETURNS TRIGGER AS $$
DECLARE
  month_year_str TEXT;
BEGIN
  -- Get month_year from the sale date
  month_year_str := to_char(NEW.created_at, 'YYYY-MM');
  
  -- Insert or update payment analytics
  INSERT INTO public.payment_analytics (
    tenant_id, 
    payment_method, 
    transaction_count, 
    total_amount, 
    average_amount, 
    month_year
  )
  VALUES (
    NEW.tenant_id,
    NEW.payment_method,
    1,
    NEW.total_amount,
    NEW.total_amount,
    month_year_str
  )
  ON CONFLICT (tenant_id, payment_method, month_year)
  DO UPDATE SET
    transaction_count = payment_analytics.transaction_count + 1,
    total_amount = payment_analytics.total_amount + NEW.total_amount,
    average_amount = (payment_analytics.total_amount + NEW.total_amount) / (payment_analytics.transaction_count + 1),
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix ABC analysis function
CREATE OR REPLACE FUNCTION get_abc_analysis(tenant_uuid UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  total_revenue NUMERIC,
  revenue_percentage NUMERIC,
  cumulative_percentage NUMERIC,
  abc_category TEXT
) AS $$
DECLARE
  total_tenant_revenue NUMERIC;
BEGIN
  -- Get total revenue for the tenant
  SELECT COALESCE(SUM(si.total), 0) INTO total_tenant_revenue
  FROM public.sale_items si
  JOIN public.sales s ON si.sale_id = s.id
  WHERE s.tenant_id = tenant_uuid;
  
  RETURN QUERY
  WITH product_revenues AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      COALESCE(SUM(si.total), 0) as total_revenue
    FROM public.products p
    LEFT JOIN public.sale_items si ON p.id = si.product_id
    LEFT JOIN public.sales s ON si.sale_id = s.id
    WHERE p.tenant_id = tenant_uuid
    GROUP BY p.id, p.name
  ),
  ranked_products AS (
    SELECT 
      pr.*,
      (pr.total_revenue / NULLIF(total_tenant_revenue, 0) * 100) as revenue_percentage,
      SUM(pr.total_revenue / NULLIF(total_tenant_revenue, 0) * 100) 
        OVER (ORDER BY pr.total_revenue DESC) as cumulative_percentage
    FROM product_revenues pr
    ORDER BY pr.total_revenue DESC
  )
  SELECT 
    rp.product_id,
    rp.product_name,
    rp.total_revenue,
    rp.revenue_percentage,
    rp.cumulative_percentage,
    CASE 
      WHEN rp.cumulative_percentage <= 80 THEN 'A'
      WHEN rp.cumulative_percentage <= 95 THEN 'B'
      ELSE 'C'
    END as abc_category
  FROM ranked_products rp
  ORDER BY rp.total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique constraint for payment_analytics
ALTER TABLE public.payment_analytics 
ADD CONSTRAINT unique_payment_analytics_tenant_method_month 
UNIQUE (tenant_id, payment_method, month_year);