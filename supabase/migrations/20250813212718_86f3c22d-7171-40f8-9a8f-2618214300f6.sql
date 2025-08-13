-- Vamos criar uma política temporária para superusuários baseada no user_id conhecido
-- Substitua pelo user_id real do superusuário principal
CREATE POLICY "Specific superuser can view all" ON public.profiles
FOR ALL
TO authenticated
USING (
  auth.uid() = '0031abe4-486a-4236-b19c-a2e4a6f51a77'::uuid  -- ID do superusuário principal
  OR user_id = auth.uid()  -- Ou é o próprio perfil do usuário
)
WITH CHECK (
  auth.uid() = '0031abe4-486a-4236-b19c-a2e4a6f51a77'::uuid  -- ID do superusuário principal
  OR user_id = auth.uid()  -- Ou é o próprio perfil do usuário
);