-- Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'combo')),
  value NUMERIC NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  products JSONB, -- Array of product IDs for specific products
  categories JSONB, -- Array of categories
  customer_ids JSONB, -- Array of specific customer IDs
  promo_code TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock movements table for detailed tracking
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer', 'adjustment', 'reservation')),
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC,
  reference_type TEXT CHECK (reference_type IN ('sale', 'purchase', 'transfer', 'adjustment', 'reservation')),
  reference_id UUID,
  from_location TEXT,
  to_location TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product reservations table
CREATE TABLE IF NOT EXISTS public.product_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  customer_id UUID,
  quantity INTEGER NOT NULL,
  reserved_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock locations table
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'warehouse' CHECK (type IN ('warehouse', 'store', 'online', 'transit')),
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seasonal analytics table
CREATE TABLE IF NOT EXISTS public.seasonal_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, product_id, month, year)
);

-- Enable RLS for all tables
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for promotions
CREATE POLICY "Users can view own tenant promotions"
  ON public.promotions FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Administrators can manage own tenant promotions"
  ON public.promotions FOR ALL
  USING (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  )
  WITH CHECK (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

-- Create RLS policies for stock movements
CREATE POLICY "Users can view own tenant stock movements"
  ON public.stock_movements FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Users can create own tenant stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (tenant_id = get_current_user_tenant());

-- Create RLS policies for product reservations
CREATE POLICY "Users can view own tenant reservations"
  ON public.product_reservations FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Users can manage own tenant reservations"
  ON public.product_reservations FOR ALL
  USING (tenant_id = get_current_user_tenant())
  WITH CHECK (tenant_id = get_current_user_tenant());

-- Create RLS policies for stock locations
CREATE POLICY "Users can view own tenant locations"
  ON public.stock_locations FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Administrators can manage own tenant locations"
  ON public.stock_locations FOR ALL
  USING (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  )
  WITH CHECK (
    (is_administrator() OR is_superuser()) 
    AND tenant_id = get_current_user_tenant()
  );

-- Create RLS policies for seasonal analytics
CREATE POLICY "Users can view own tenant seasonal analytics"
  ON public.seasonal_analytics FOR SELECT
  USING (tenant_id = get_current_user_tenant());

CREATE POLICY "System can manage seasonal analytics"
  ON public.seasonal_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_tenant_dates 
  ON public.promotions(tenant_id, start_date, end_date) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_product 
  ON public.stock_movements(tenant_id, product_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reservations_tenant_status 
  ON public.product_reservations(tenant_id, status, reserved_until);

CREATE INDEX IF NOT EXISTS idx_seasonal_analytics_tenant_product 
  ON public.seasonal_analytics(tenant_id, product_id, year, month);

-- Function to track stock movements automatically
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Log stock changes from sales
  IF TG_TABLE_NAME = 'sale_items' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.stock_movements (
      tenant_id, product_id, movement_type, quantity, 
      reference_type, reference_id, created_by
    ) VALUES (
      NEW.tenant_id, NEW.product_id, 'out', NEW.quantity,
      'sale', NEW.sale_id, 
      (SELECT created_by FROM public.sales WHERE id = NEW.sale_id LIMIT 1)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic stock movement logging
DROP TRIGGER IF EXISTS trigger_log_stock_movement ON public.sale_items;
CREATE TRIGGER trigger_log_stock_movement
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();

-- Function to update seasonal analytics
CREATE OR REPLACE FUNCTION update_seasonal_analytics()
RETURNS TRIGGER AS $$
DECLARE
  sale_month INTEGER;
  sale_year INTEGER;
BEGIN
  -- Extract month and year from sale date
  sale_month := EXTRACT(MONTH FROM NEW.created_at);
  sale_year := EXTRACT(YEAR FROM NEW.created_at);
  
  -- Update seasonal analytics for each sale item
  INSERT INTO public.seasonal_analytics (
    tenant_id, product_id, month, year, 
    quantity_sold, revenue, avg_price
  )
  SELECT 
    si.tenant_id, si.product_id, sale_month, sale_year,
    SUM(si.quantity), SUM(si.total), AVG(si.unit_price)
  FROM public.sale_items si
  WHERE si.sale_id = NEW.id
  GROUP BY si.tenant_id, si.product_id
  ON CONFLICT (tenant_id, product_id, month, year)
  DO UPDATE SET
    quantity_sold = seasonal_analytics.quantity_sold + EXCLUDED.quantity_sold,
    revenue = seasonal_analytics.revenue + EXCLUDED.revenue,
    avg_price = (seasonal_analytics.revenue + EXCLUDED.revenue) / 
                (seasonal_analytics.quantity_sold + EXCLUDED.quantity_sold),
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for seasonal analytics
DROP TRIGGER IF EXISTS trigger_update_seasonal_analytics ON public.sales;
CREATE TRIGGER trigger_update_seasonal_analytics
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_seasonal_analytics();

-- Function to calculate promotion discounts
CREATE OR REPLACE FUNCTION calculate_promotion_discount(
  promotion_id_param UUID,
  item_quantity INTEGER,
  item_price NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  promo RECORD;
  discount_amount NUMERIC := 0;
BEGIN
  SELECT * INTO promo FROM public.promotions 
  WHERE id = promotion_id_param 
    AND active = true 
    AND start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
    AND (max_uses IS NULL OR current_uses < max_uses)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check minimum quantity requirement
  IF item_quantity < promo.min_quantity THEN
    RETURN 0;
  END IF;
  
  -- Calculate discount based on type
  CASE promo.type
    WHEN 'percentage' THEN
      discount_amount := (item_price * item_quantity) * (promo.value / 100);
    WHEN 'fixed_amount' THEN
      discount_amount := promo.value;
    WHEN 'buy_x_get_y' THEN
      -- Simple buy X get Y logic (every X items, get discount on Y items)
      discount_amount := FLOOR(item_quantity / promo.min_quantity::NUMERIC) * promo.value;
    ELSE
      discount_amount := 0;
  END CASE;
  
  RETURN GREATEST(0, discount_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;