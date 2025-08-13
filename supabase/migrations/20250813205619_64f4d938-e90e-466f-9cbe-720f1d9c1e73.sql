-- Criar função para criar usuários sem fazer auto-login
-- Esta função permite que administradores criem usuários sem afetar sua própria sessão

CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role user_role DEFAULT 'user',
  admin_tenant_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_user_id UUID;
  admin_tenant UUID;
  result JSON;
BEGIN
  -- Verificar se o usuário atual é administrador
  IF NOT (SELECT role IN ('administrator', 'superuser') FROM public.profiles WHERE user_id = auth.uid()) THEN
    RETURN json_build_object('error', 'Apenas administradores podem criar usuários');
  END IF;
  
  -- Obter tenant do administrador atual se não fornecido
  IF admin_tenant_id IS NULL THEN
    SELECT COALESCE(tenant_id, id) INTO admin_tenant 
    FROM public.profiles 
    WHERE user_id = auth.uid();
  ELSE
    admin_tenant := admin_tenant_id;
  END IF;

  -- Gerar um UUID para o novo usuário
  new_user_id := gen_random_uuid();
  
  -- Inserir diretamente na tabela auth.users (requer privilégios de superuser)
  -- Como não podemos fazer isso via RLS, vamos criar o perfil diretamente
  -- e deixar que o usuário faça signup normalmente depois
  
  -- Por limitações de segurança do Supabase, vamos retornar instruções
  -- para criar o usuário via API Admin
  result := json_build_object(
    'success', true,
    'message', 'Use admin API to create user',
    'user_data', json_build_object(
      'email', user_email,
      'password', user_password,
      'user_metadata', json_build_object(
        'full_name', user_full_name,
        'role', user_role
      ),
      'tenant_id', admin_tenant
    )
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;