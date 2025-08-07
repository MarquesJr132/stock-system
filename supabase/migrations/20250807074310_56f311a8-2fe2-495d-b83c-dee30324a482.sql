-- Corrigir função com search_path seguro
CREATE OR REPLACE FUNCTION assign_user_to_admin_tenant(user_email TEXT, admin_email TEXT)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_tenant_id UUID;
  admin_profile_id UUID;
BEGIN
  -- Buscar o tenant_id do administrador
  SELECT tenant_id, id INTO admin_tenant_id, admin_profile_id 
  FROM public.profiles 
  WHERE email = admin_email AND role = 'administrator';
  
  -- Atualizar o usuário com o tenant correto
  UPDATE public.profiles 
  SET tenant_id = admin_tenant_id, 
      created_by = admin_profile_id,
      updated_at = NOW()
  WHERE email = user_email AND role = 'user';
END;
$$;