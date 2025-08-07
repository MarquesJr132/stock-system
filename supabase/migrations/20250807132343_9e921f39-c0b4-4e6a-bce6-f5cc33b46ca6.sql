-- Fix security issues by adding search_path to functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix audit log function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';