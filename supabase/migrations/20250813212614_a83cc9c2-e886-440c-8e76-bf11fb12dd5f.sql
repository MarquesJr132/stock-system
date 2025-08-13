-- Vamos remover TODAS as políticas problemáticas e recriar de forma simples
DROP POLICY IF EXISTS "Superusers can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view tenant users" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Política simples: usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile simple" ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política simples: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile simple" ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política simples: usuários podem inserir apenas seu próprio perfil
CREATE POLICY "Users can insert own profile simple" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role continua com acesso total (para edge functions)
-- Esta política já existe: "Service role full access"