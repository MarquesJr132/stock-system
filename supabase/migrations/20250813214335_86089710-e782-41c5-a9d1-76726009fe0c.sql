-- Corrigir políticas RLS para tenant_limits para permitir que superusers criem e atualizem limites

-- Primeiro, remover as políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Tenant access to tenant limits" ON public.tenant_limits;
DROP POLICY IF EXISTS "Service role full access - tenant_limits" ON public.tenant_limits;

-- Criar novas políticas mais específicas
-- Superusers podem fazer tudo
CREATE POLICY "Superusers full access to tenant limits" ON public.tenant_limits
FOR ALL
TO authenticated
USING (
  get_current_user_role() = 'superuser'
)
WITH CHECK (
  get_current_user_role() = 'superuser'
);

-- Administradores podem ver apenas seus próprios limites
CREATE POLICY "Administrators can view own tenant limits" ON public.tenant_limits
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT COALESCE(p.tenant_id, p.id) 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Service role mantém acesso total
CREATE POLICY "Service role full access - tenant_limits" ON public.tenant_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);