-- Primeiro, vamos verificar se o trigger existe e recriá-lo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar a função handle_new_user com melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir perfil na tabela profiles
  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator'
      THEN gen_random_uuid() -- Administradores têm seu próprio tenant_id
      ELSE NULL -- Usuários normais terão tenant_id atribuído depois
    END
  );
  
  -- Se for administrador, também atualizar o tenant_id para ser igual ao id do perfil
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator' THEN
    UPDATE public.profiles 
    SET tenant_id = id 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha a criação do usuário
    RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Agora vamos corrigir os usuários que foram criados no Auth mas não têm perfil
-- Primeiro, vamos buscar usuários do Auth que não têm perfil
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL
  LOOP
    -- Criar perfil para usuários sem perfil
    INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'user'),
      CASE 
        WHEN COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator'
        THEN gen_random_uuid()
        ELSE NULL
      END
    );
    
    -- Se for administrador, atualizar tenant_id
    IF COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator' THEN
      UPDATE public.profiles 
      SET tenant_id = id 
      WHERE user_id = auth_user.id;
    END IF;
    
    RAISE NOTICE 'Perfil criado para usuário: %', auth_user.email;
  END LOOP;
END $$;