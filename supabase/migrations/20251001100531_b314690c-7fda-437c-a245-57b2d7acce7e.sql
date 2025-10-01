-- Drop and recreate cleanup_tenant_data function with proper deletion order
DROP FUNCTION IF EXISTS public.cleanup_tenant_data(uuid);

CREATE OR REPLACE FUNCTION public.cleanup_tenant_data(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Delete in order respecting foreign key dependencies
  -- This order ensures child records are deleted before parent records
  
  -- 1. Delete special order items first (child of special_orders)
  DELETE FROM public.special_order_items WHERE tenant_id = tenant_uuid;
  
  -- 2. Delete special orders (child of customers)
  DELETE FROM public.special_orders WHERE tenant_id = tenant_uuid;
  
  -- 3. Delete purchase order items first (child of purchase_orders)
  DELETE FROM public.purchase_order_items 
  WHERE purchase_order_id IN (
    SELECT id FROM public.purchase_orders WHERE tenant_id = tenant_uuid
  );
  
  -- 4. Delete purchase orders (child of suppliers)
  DELETE FROM public.purchase_orders WHERE tenant_id = tenant_uuid;
  
  -- 5. Delete quotation items (child of quotations)
  DELETE FROM public.quotation_items WHERE tenant_id = tenant_uuid;
  
  -- 6. Delete quotations
  DELETE FROM public.quotations WHERE tenant_id = tenant_uuid;
  
  -- 7. Delete sale items (child of sales)
  DELETE FROM public.sale_items WHERE tenant_id = tenant_uuid;
  
  -- 8. Delete sales
  DELETE FROM public.sales WHERE tenant_id = tenant_uuid;
  
  -- 9. Delete product reservations (child of products and customers)
  DELETE FROM public.product_reservations WHERE tenant_id = tenant_uuid;
  
  -- 10. Delete stock movements (references products)
  DELETE FROM public.stock_movements WHERE tenant_id = tenant_uuid;
  
  -- 11. Now safe to delete parent records
  DELETE FROM public.customers WHERE tenant_id = tenant_uuid;
  DELETE FROM public.suppliers WHERE tenant_id = tenant_uuid;
  DELETE FROM public.products WHERE tenant_id = tenant_uuid;
  
  -- 12. Delete other tenant-related records
  DELETE FROM public.business_goals WHERE tenant_id = tenant_uuid;
  DELETE FROM public.promotions WHERE tenant_id = tenant_uuid;
  DELETE FROM public.stock_locations WHERE tenant_id = tenant_uuid;
  DELETE FROM public.seasonal_analytics WHERE tenant_id = tenant_uuid;
  DELETE FROM public.payment_analytics WHERE tenant_id = tenant_uuid;
  DELETE FROM public.monthly_statistics WHERE tenant_id = tenant_uuid;
  DELETE FROM public.tenant_features WHERE tenant_id = tenant_uuid;
  DELETE FROM public.tenant_limits WHERE tenant_id = tenant_uuid;
  DELETE FROM public.data_usage_log WHERE tenant_id = tenant_uuid;
  DELETE FROM public.company_settings WHERE tenant_id = tenant_uuid;
  DELETE FROM public.notifications WHERE tenant_id = tenant_uuid;
  DELETE FROM public.audit_logs WHERE tenant_id = tenant_uuid;
  DELETE FROM public.system_settings WHERE tenant_id = tenant_uuid;
  
  -- 13. Finally, delete user profiles (except administrator)
  DELETE FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
    AND role != 'administrator';
  
  RAISE NOTICE 'Cleaned up all data for tenant: % in correct order', tenant_uuid;
END;
$function$;