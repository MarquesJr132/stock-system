-- Adicionar políticas para as tabelas que faltaram

-- Tenant Limits
CREATE POLICY "Tenant access to tenant limits" ON public.tenant_limits
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Data Usage Log
CREATE POLICY "Tenant access to data usage log" ON public.data_usage_log
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Service role access para estas tabelas também
CREATE POLICY "Service role full access - tenant_limits" ON public.tenant_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - data_usage_log" ON public.data_usage_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);