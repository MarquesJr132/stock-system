-- Create function to reassign foreign keys before user deletion
CREATE OR REPLACE FUNCTION public.reassign_user_data_before_deletion(user_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tenant_admin_id uuid;
  tenant_uuid uuid;
BEGIN
  -- Get tenant and admin info for the user being deleted
  SELECT tenant_id INTO tenant_uuid
  FROM public.profiles 
  WHERE id = user_profile_id;
  
  -- Find another admin in the same tenant to reassign data to
  SELECT id INTO tenant_admin_id
  FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role IN ('administrator', 'superuser')
    AND id != user_profile_id
  LIMIT 1;
  
  -- If no other admin found, use a system admin (optional)
  IF tenant_admin_id IS NULL THEN
    -- Could implement system admin logic here if needed
    RAISE NOTICE 'No other admin found to reassign data for tenant %', tenant_uuid;
    RETURN;
  END IF;
  
  -- Reassign all created_by references
  UPDATE public.products SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.customers SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.sales SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.quotations SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.special_orders SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.stock_movements SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.business_goals SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.promotions SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.suppliers SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.purchase_orders SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.product_reservations SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.stock_locations SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.tenant_limits SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  UPDATE public.data_usage_log SET created_by = tenant_admin_id WHERE created_by = user_profile_id;
  
  RAISE NOTICE 'Reassigned user data from % to % for tenant %', user_profile_id, tenant_admin_id, tenant_uuid;
END;
$$;