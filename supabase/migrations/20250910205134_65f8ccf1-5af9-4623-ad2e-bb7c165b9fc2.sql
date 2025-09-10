-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_tenant_limits_with_admin_info();

-- Add space control columns to tenant_limits
ALTER TABLE public.tenant_limits 
ADD COLUMN IF NOT EXISTS monthly_space_limit_mb integer DEFAULT 500,
ADD COLUMN IF NOT EXISTS current_month_space_usage_mb numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS space_estimation_config jsonb DEFAULT '{
  "product_avg_size_bytes": 1024,
  "customer_avg_size_bytes": 512,
  "sale_avg_size_bytes": 256,
  "sale_item_avg_size_bytes": 128,
  "quotation_avg_size_bytes": 256,
  "quotation_item_avg_size_bytes": 128,
  "special_order_avg_size_bytes": 256,
  "supplier_avg_size_bytes": 512,
  "purchase_order_avg_size_bytes": 256
}'::jsonb;

-- Create function to estimate space usage for a tenant
CREATE OR REPLACE FUNCTION public.estimate_tenant_space_usage(tenant_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  config jsonb;
  total_size_bytes numeric := 0;
  product_count integer;
  customer_count integer;
  sale_count integer;
  sale_item_count integer;
  quotation_count integer;
  quotation_item_count integer;
  special_order_count integer;
  supplier_count integer;
  purchase_order_count integer;
BEGIN
  -- Get estimation config
  SELECT space_estimation_config INTO config
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Default config if none exists
  IF config IS NULL THEN
    config := '{
      "product_avg_size_bytes": 1024,
      "customer_avg_size_bytes": 512,
      "sale_avg_size_bytes": 256,
      "sale_item_avg_size_bytes": 128,
      "quotation_avg_size_bytes": 256,
      "quotation_item_avg_size_bytes": 128,
      "special_order_avg_size_bytes": 256,
      "supplier_avg_size_bytes": 512,
      "purchase_order_avg_size_bytes": 256
    }'::jsonb;
  END IF;
  
  -- Count records for each table
  SELECT COUNT(*) INTO product_count FROM public.products WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO customer_count FROM public.customers WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO sale_count FROM public.sales WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO sale_item_count FROM public.sale_items WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO quotation_count FROM public.quotations WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO quotation_item_count FROM public.quotation_items WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO special_order_count FROM public.special_orders WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO supplier_count FROM public.suppliers WHERE tenant_id = tenant_uuid;
  SELECT COUNT(*) INTO purchase_order_count FROM public.purchase_orders WHERE tenant_id = tenant_uuid;
  
  -- Calculate estimated total size
  total_size_bytes := 
    (product_count * (config->>'product_avg_size_bytes')::numeric) +
    (customer_count * (config->>'customer_avg_size_bytes')::numeric) +
    (sale_count * (config->>'sale_avg_size_bytes')::numeric) +
    (sale_item_count * (config->>'sale_item_avg_size_bytes')::numeric) +
    (quotation_count * (config->>'quotation_avg_size_bytes')::numeric) +
    (quotation_item_count * (config->>'quotation_item_avg_size_bytes')::numeric) +
    (special_order_count * (config->>'special_order_avg_size_bytes')::numeric) +
    (supplier_count * (config->>'supplier_avg_size_bytes')::numeric) +
    (purchase_order_count * (config->>'purchase_order_avg_size_bytes')::numeric);
  
  -- Convert to MB and return
  RETURN ROUND(total_size_bytes / 1024.0 / 1024.0, 2);
END;
$$;

-- Update sync function to include space estimation
CREATE OR REPLACE FUNCTION public.sync_tenant_data_usage(tenant_uuid uuid, count_all_data boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month_start DATE;
  data_count INTEGER := 0;
  user_count INTEGER := 0;
  space_usage_mb NUMERIC := 0;
  date_filter_condition TEXT;
BEGIN
  -- Calcular início do mês atual
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Determinar se deve contar todos os dados ou apenas do mês atual
  IF count_all_data THEN
    date_filter_condition := '';
  ELSE
    date_filter_condition := ' AND created_at >= ''' || current_month_start || '''';
  END IF;
  
  -- Contar dados (produtos + vendas + clientes)
  EXECUTE format('
    SELECT 
      COALESCE(
        (SELECT COUNT(*) FROM public.products WHERE tenant_id = %L %s) +
        (SELECT COUNT(*) FROM public.sales WHERE tenant_id = %L %s) +
        (SELECT COUNT(*) FROM public.customers WHERE tenant_id = %L %s)
      , 0)',
    tenant_uuid, date_filter_condition,
    tenant_uuid, date_filter_condition,
    tenant_uuid, date_filter_condition
  ) INTO data_count;
  
  -- Contar usuários
  IF count_all_data THEN
    SELECT COUNT(*) INTO user_count
    FROM public.profiles 
    WHERE tenant_id = tenant_uuid 
      AND role = 'user';
  ELSE
    SELECT COUNT(*) INTO user_count
    FROM public.profiles 
    WHERE tenant_id = tenant_uuid 
      AND role = 'user'
      AND created_at >= current_month_start;
  END IF;
  
  -- Estimar uso de espaço
  SELECT public.estimate_tenant_space_usage(tenant_uuid) INTO space_usage_mb;
  
  -- Atualizar ou inserir o registro de limites
  INSERT INTO public.tenant_limits (
    tenant_id, 
    current_month_usage, 
    current_month_users,
    current_month_space_usage_mb,
    limit_period_start,
    created_by
  ) 
  VALUES (
    tenant_uuid, 
    data_count,
    user_count,
    space_usage_mb,
    current_month_start,
    tenant_uuid
  )
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    current_month_usage = EXCLUDED.current_month_usage,
    current_month_users = EXCLUDED.current_month_users,
    current_month_space_usage_mb = space_usage_mb,
    limit_period_start = CASE 
      WHEN count_all_data THEN tenant_limits.limit_period_start
      ELSE current_month_start
    END,
    updated_at = NOW();
    
  RAISE NOTICE 'Synced tenant % - Data: %, Users: %, Space: %MB (count_all: %)', 
    tenant_uuid, data_count, user_count, space_usage_mb, count_all_data;
END;
$$;

-- Function to check space limit
CREATE OR REPLACE FUNCTION public.check_space_limit(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_space_limit_mb INTEGER;
  current_space_usage_mb NUMERIC;
BEGIN
  -- Buscar limite atual de espaço
  SELECT monthly_space_limit_mb, current_month_space_usage_mb 
  INTO current_space_limit_mb, current_space_usage_mb
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, criar um padrão e permitir
  IF NOT FOUND THEN
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode usar mais espaço (se já atingiu o limite, retornar false)
  IF current_space_usage_mb >= current_space_limit_mb THEN
    RAISE NOTICE 'Space limit exceeded for tenant %. Current: %MB, Limit: %MB', 
      tenant_uuid, current_space_usage_mb, current_space_limit_mb;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update tenant limits initialization to include space limits
CREATE OR REPLACE FUNCTION public.initialize_tenant_limits(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir limites padrão se não existirem
  INSERT INTO public.tenant_limits (
    tenant_id,
    monthly_data_limit,
    monthly_user_limit,
    monthly_space_limit_mb,
    current_month_usage,
    current_month_users,
    current_month_space_usage_mb,
    created_by,
    limit_period_start
  ) 
  VALUES (
    tenant_uuid,
    1000, -- limite padrão de dados
    10,   -- limite padrão de usuários
    500,  -- limite padrão de espaço (500MB)
    0,    -- uso inicial zerado
    0,    -- usuários inicial zerado
    0,    -- espaço inicial zerado
    tenant_uuid,
    date_trunc('month', CURRENT_DATE)::DATE
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    monthly_space_limit_mb = COALESCE(tenant_limits.monthly_space_limit_mb, 500),
    current_month_space_usage_mb = COALESCE(tenant_limits.current_month_space_usage_mb, 0);
  
  RAISE NOTICE 'Initialized default limits for tenant: %', tenant_uuid;
END;
$$;

-- Create updated function to get tenant limits with admin info including space data
CREATE OR REPLACE FUNCTION public.get_tenant_limits_with_admin_info()
RETURNS TABLE(
  id uuid, 
  tenant_id uuid, 
  monthly_data_limit integer, 
  monthly_user_limit integer, 
  monthly_space_limit_mb integer,
  current_month_usage integer, 
  current_month_users integer, 
  current_month_space_usage_mb numeric,
  limit_period_start date, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  admin_email text, 
  admin_full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tl.id,
    tl.tenant_id,
    tl.monthly_data_limit,
    tl.monthly_user_limit,
    COALESCE(tl.monthly_space_limit_mb, 500) as monthly_space_limit_mb,
    tl.current_month_usage,
    tl.current_month_users,
    COALESCE(tl.current_month_space_usage_mb, 0) as current_month_space_usage_mb,
    tl.limit_period_start,
    tl.created_at,
    tl.updated_at,
    p.email as admin_email,
    p.full_name as admin_full_name
  FROM public.tenant_limits tl
  INNER JOIN public.profiles p ON (COALESCE(p.tenant_id, p.id) = tl.tenant_id)
  WHERE p.role = 'administrator'
  ORDER BY p.full_name;
END;
$$;