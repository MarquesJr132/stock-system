-- Create function to assign basic features to new tenants
CREATE OR REPLACE FUNCTION public.assign_basic_features_to_tenant(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert basic features for the new tenant
  INSERT INTO public.tenant_features (tenant_id, feature_code, enabled)
  SELECT 
    tenant_uuid,
    code,
    true
  FROM public.available_features
  WHERE category = 'basic' OR code IN (
    'dashboard_basic',
    'dashboard_kpis',
    'products_management',
    'sales_management',
    'customers_management',
    'stock_management',
    'reports_basic'
  )
  ON CONFLICT (tenant_id, feature_code) DO NOTHING;
  
  RAISE NOTICE 'Assigned basic features to tenant: %', tenant_uuid;
END;
$function$;

-- Update handle_new_administrator to assign features
CREATE OR REPLACE FUNCTION public.handle_new_administrator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Se é um administrador, inicializar os limites automaticamente
  IF NEW.role = 'administrator' THEN
    -- Usar tenant_id se existir, senão usar o próprio id
    PERFORM public.initialize_tenant_limits(COALESCE(NEW.tenant_id, NEW.id));
    
    -- Atribuir features básicas
    PERFORM public.assign_basic_features_to_tenant(COALESCE(NEW.tenant_id, NEW.id));
  END IF;
  
  RETURN NEW;
END;
$function$;