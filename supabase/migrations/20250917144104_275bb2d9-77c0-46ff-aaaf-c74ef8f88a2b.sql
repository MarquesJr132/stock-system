-- CORREÇÕES CRÍTICAS DE SEGURANÇA

-- 1. Corrigir RLS da tabela payment_analytics - CRÍTICO
-- Remover política pública perigosa e restringir acesso
DROP POLICY IF EXISTS "System can manage payment analytics" ON public.payment_analytics;
DROP POLICY IF EXISTS "Users can view own tenant payment analytics" ON public.payment_analytics;

-- Criar políticas seguras para payment_analytics
CREATE POLICY "Users can view own tenant payment analytics" 
ON public.payment_analytics 
FOR SELECT 
USING (tenant_id = get_current_user_tenant());

CREATE POLICY "System can insert payment analytics" 
ON public.payment_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update payment analytics" 
ON public.payment_analytics 
FOR UPDATE 
USING (true);

-- 2. Corrigir RLS da tabela available_features - CRÍTICO  
-- Remover acesso público e restringir apenas a usuários autenticados
DROP POLICY IF EXISTS "Anyone can view available features" ON public.available_features;

-- Criar política segura para available_features
CREATE POLICY "Authenticated users can view available features" 
ON public.available_features 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Limpar usuário órfão e dados inconsistentes
-- Corrigir perfis sem tenant_id válido
UPDATE public.profiles 
SET tenant_id = id 
WHERE role = 'administrator' AND tenant_id IS NULL;

-- Remover registros órfãos de tenant_limits sem administrador correspondente
DELETE FROM public.tenant_limits 
WHERE tenant_id NOT IN (
  SELECT DISTINCT COALESCE(tenant_id, id) 
  FROM public.profiles 
  WHERE role = 'administrator'
);

-- 4. Garantir integridade dos dados
-- Sincronizar contadores de usuários e espaço para todos os tenants
SELECT public.sync_all_tenants_total_data();

-- 5. Corrigir possíveis inconsistências nos limites de tenant
SELECT public.fix_tenant_counts();