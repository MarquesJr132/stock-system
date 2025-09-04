-- Create table for business goals and targets
CREATE TABLE IF NOT EXISTS public.business_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  goal_type TEXT NOT NULL, -- 'monthly_sales', 'monthly_profit', 'customer_acquisition', etc.
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  description TEXT
);

-- Enable RLS
ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for business_goals
CREATE POLICY "Users can view own tenant business goals"
  ON public.business_goals
  FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Administrators can manage own tenant business goals"
  ON public.business_goals
  FOR ALL
  USING (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  )
  WITH CHECK (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

-- Create table for tracking payment method analytics
CREATE TABLE IF NOT EXISTS public.payment_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  average_amount NUMERIC NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_analytics
CREATE POLICY "Users can view own tenant payment analytics"
  ON public.payment_analytics
  FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "System can manage payment analytics"
  ON public.payment_analytics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_goals_tenant_period 
  ON public.business_goals(tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_payment_analytics_tenant_month 
  ON public.payment_analytics(tenant_id, month_year);

-- Function to update payment analytics when sales are created/updated
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
$$ LANGUAGE plpgsql;

-- Create trigger for payment analytics
DROP TRIGGER IF EXISTS trigger_update_payment_analytics ON public.sales;
CREATE TRIGGER trigger_update_payment_analytics
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_analytics();

-- Function to calculate ABC analysis for products
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
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.tenant_id = tenant_uuid;
  
  RETURN QUERY
  WITH product_revenues AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      COALESCE(SUM(si.total), 0) as total_revenue
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id
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
$$ LANGUAGE plpgsql;