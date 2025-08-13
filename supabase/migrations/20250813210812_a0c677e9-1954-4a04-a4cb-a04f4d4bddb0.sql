-- Primeiro, vamos desabilitar temporariamente o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Agora vamos recrear o trigger de forma mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir perfil na tabela profiles apenas se não existir
  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator'
      THEN NULL -- Será definido depois pela edge function
      ELSE NULL -- Usuários normais terão tenant_id atribuído depois
    END
  )
  ON CONFLICT (user_id) DO NOTHING; -- Ignora se já existir
  
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