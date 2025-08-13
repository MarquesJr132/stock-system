-- Corrigir políticas RLS para ordens de compra
DROP POLICY IF EXISTS "Administrators can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can view purchase orders from their tenant" ON public.purchase_orders;

-- Política para visualizar ordens de compra
CREATE POLICY "Users can view purchase orders from their tenant" 
ON public.purchase_orders 
FOR SELECT 
USING (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Política para inserção de ordens de compra
CREATE POLICY "Administrators can create purchase orders" 
ON public.purchase_orders 
FOR INSERT 
WITH CHECK (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Política para atualização de ordens de compra
CREATE POLICY "Administrators can update purchase orders" 
ON public.purchase_orders 
FOR UPDATE 
USING (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Política para deletar ordens de compra
CREATE POLICY "Administrators can delete purchase orders" 
ON public.purchase_orders 
FOR DELETE 
USING (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Corrigir políticas RLS para itens da ordem de compra
DROP POLICY IF EXISTS "Administrators can manage purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can view purchase order items from their tenant" ON public.purchase_order_items;

-- Política para visualizar itens da ordem de compra
CREATE POLICY "Users can view purchase order items from their tenant" 
ON public.purchase_order_items 
FOR SELECT 
USING (purchase_order_id IN ( 
  SELECT purchase_orders.id FROM purchase_orders 
  WHERE purchase_orders.tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())
));

-- Política para inserção de itens da ordem de compra
CREATE POLICY "Administrators can create purchase order items" 
ON public.purchase_order_items 
FOR INSERT 
WITH CHECK (
  purchase_order_id IN ( 
    SELECT purchase_orders.id FROM purchase_orders 
    WHERE purchase_orders.tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())
  ) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Política para atualização de itens da ordem de compra
CREATE POLICY "Administrators can update purchase order items" 
ON public.purchase_order_items 
FOR UPDATE 
USING (
  purchase_order_id IN ( 
    SELECT purchase_orders.id FROM purchase_orders 
    WHERE purchase_orders.tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())
  ) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Política para deletar itens da ordem de compra
CREATE POLICY "Administrators can delete purchase order items" 
ON public.purchase_order_items 
FOR DELETE 
USING (
  purchase_order_id IN ( 
    SELECT purchase_orders.id FROM purchase_orders 
    WHERE purchase_orders.tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())
  ) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);