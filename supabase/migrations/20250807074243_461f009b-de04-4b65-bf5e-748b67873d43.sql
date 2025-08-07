-- Criar função para atribuir usuários ao tenant correto
CREATE OR REPLACE FUNCTION assign_user_to_admin_tenant(user_email TEXT, admin_email TEXT)
RETURNS void AS $$
DECLARE
  admin_tenant_id UUID;
  admin_profile_id UUID;
BEGIN
  -- Buscar o tenant_id do administrador
  SELECT tenant_id, id INTO admin_tenant_id, admin_profile_id 
  FROM profiles 
  WHERE email = admin_email AND role = 'administrator';
  
  -- Atualizar o usuário com o tenant correto
  UPDATE profiles 
  SET tenant_id = admin_tenant_id, 
      created_by = admin_profile_id,
      updated_at = NOW()
  WHERE email = user_email AND role = 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrigir usuários existentes
SELECT assign_user_to_admin_tenant('soluwebmz@gmail.com', 'marquesjunior132@gmail.com');
SELECT assign_user_to_admin_tenant('risedaily132@gmail.com', 'marquesjunior132@gmail.com');
SELECT assign_user_to_admin_tenant('jotinha12345678900@gmail.com', 'marquesjason132@gmail.com');