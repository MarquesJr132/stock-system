-- Primeiro, vamos remover as políticas problemáticas temporariamente
DROP POLICY IF EXISTS "Administrators can create tenant users" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can update tenant users" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view tenant users" ON public.profiles;
DROP POLICY IF EXISTS "Gerente can view tenant users" ON public.profiles;

-- Vamos criar políticas mais simples que não causam recursão
-- Permitir que o service role (usado pela edge function) acesse tudo
CREATE POLICY "Service role full access" ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Permitir aos usuários ver e atualizar apenas seu próprio perfil
CREATE POLICY "Users can manage own profile" ON public.profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Superusers podem ver tudo (sem usar função recursiva)
CREATE POLICY "Superusers can view all" ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'superuser'
  )
);

-- Administradores podem ver usuários do mesmo tenant
CREATE POLICY "Admins can view tenant users" ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.role IN ('administrator', 'superuser')
    AND (
      admin_profile.role = 'superuser' 
      OR 
      COALESCE(public.profiles.tenant_id, public.profiles.id) = COALESCE(admin_profile.tenant_id, admin_profile.id)
    )
  )
);