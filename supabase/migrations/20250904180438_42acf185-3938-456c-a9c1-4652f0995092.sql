-- Fix RLS policy for viewing audit logs (admins by tenant)
DROP POLICY IF EXISTS "Administrators can view their tenant audit logs" ON public.audit_logs;

CREATE POLICY "Administrators can view their tenant audit logs"
ON public.audit_logs
FOR SELECT
USING (
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
  AND tenant_id = get_current_user_tenant()
);

-- Ensure superusers can view all logs (idempotent recreation)
DROP POLICY IF EXISTS "Superusers can view all audit logs" ON public.audit_logs;
CREATE POLICY "Superusers can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (get_current_user_role() = 'superuser'::user_role);

-- Add audit triggers to core tables (idempotent)
DO $$ BEGIN
  CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_quotations
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_special_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.special_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;