-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_number TEXT,
  payment_terms INTEGER DEFAULT 30,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'stock_alert', 'sale_alert')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'received', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, setting_key)
);

-- Add barcode column to products table
ALTER TABLE public.products 
ADD COLUMN barcode TEXT,
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN reorder_level INTEGER DEFAULT 0,
ADD COLUMN reorder_quantity INTEGER DEFAULT 0;

-- Create unique index for barcodes within tenant
CREATE UNIQUE INDEX idx_products_barcode_tenant ON public.products(barcode, tenant_id) WHERE barcode IS NOT NULL;

-- Enable RLS on all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers
CREATE POLICY "Users can view suppliers from their tenant" 
ON public.suppliers 
FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Administrators can create suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

CREATE POLICY "Administrators can update suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

CREATE POLICY "Administrators can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create RLS policies for purchase orders
CREATE POLICY "Users can view purchase orders from their tenant" 
ON public.purchase_orders 
FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Administrators can manage purchase orders" 
ON public.purchase_orders 
FOR ALL 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

-- Create RLS policies for purchase order items
CREATE POLICY "Users can view purchase order items from their tenant" 
ON public.purchase_order_items 
FOR SELECT 
USING (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Administrators can manage purchase order items" 
ON public.purchase_order_items 
FOR ALL 
USING (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ) AND public.get_current_user_role() IN ('administrator', 'superuser')
);

-- Create RLS policies for audit logs
CREATE POLICY "Superusers can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.get_current_user_role() = 'superuser');

CREATE POLICY "Administrators can view their tenant audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

CREATE POLICY "System can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for system settings
CREATE POLICY "Users can view their tenant settings" 
ON public.system_settings 
FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Administrators can manage their tenant settings" 
ON public.system_settings 
FOR ALL 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
  AND public.get_current_user_role() IN ('administrator', 'superuser')
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate notification for low stock
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product quantity is at or below reorder level
  IF NEW.quantity <= NEW.reorder_level AND NEW.reorder_level > 0 THEN
    INSERT INTO public.notifications (
      tenant_id,
      title,
      message,
      type,
      priority,
      metadata
    ) VALUES (
      NEW.tenant_id,
      'Stock Baixo',
      'O produto "' || NEW.name || '" está com stock baixo (' || NEW.quantity || ' unidades restantes)',
      'stock_alert',
      'high',
      jsonb_build_object('product_id', NEW.id, 'current_quantity', NEW.quantity, 'reorder_level', NEW.reorder_level)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for low stock notifications
CREATE TRIGGER trigger_check_low_stock
AFTER UPDATE OF quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock();

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_val UUID;
BEGIN
  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  ) VALUES (
    tenant_id_val,
    auth.uid(),
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_sales
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_suppliers
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();