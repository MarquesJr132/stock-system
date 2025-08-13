-- Corrigir política RLS para criação de fornecedores
DROP POLICY IF EXISTS "Administrators can create suppliers" ON public.suppliers;

-- Criar nova política corrigida para inserção de fornecedores
CREATE POLICY "Administrators can create suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Corrigir também as outras políticas para consistência
DROP POLICY IF EXISTS "Administrators can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Administrators can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers from their tenant" ON public.suppliers;

-- Política para visualizar fornecedores
CREATE POLICY "Users can view suppliers from their tenant" 
ON public.suppliers 
FOR SELECT 
USING (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Política para atualizar fornecedores
CREATE POLICY "Administrators can update suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);

-- Política para deletar fornecedores
CREATE POLICY "Administrators can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (
  (tenant_id = ( SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid())) 
  AND 
  (get_current_user_role() = ANY (ARRAY['administrator'::user_role, 'superuser'::user_role]))
);