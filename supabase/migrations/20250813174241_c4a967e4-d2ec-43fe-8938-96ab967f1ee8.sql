-- Verificar usuários órfãos no Auth (que não têm perfil)
-- e remover apenas aqueles que não são superusers ativos

-- Função para remover usuários órfãos do Auth que não têm perfil
DO $$
DECLARE
  orphaned_user RECORD;
  current_superuser_id UUID;
BEGIN
  -- Obter o ID do superuser atual (para não apagar)
  SELECT user_id INTO current_superuser_id 
  FROM public.profiles 
  WHERE role = 'superuser' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Buscar usuários órfãos no Auth
  FOR orphaned_user IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL 
      AND au.id != COALESCE(current_superuser_id, '00000000-0000-0000-0000-000000000000')
  LOOP
    -- Remover o usuário do Auth
    DELETE FROM auth.users WHERE id = orphaned_user.id;
    
    RAISE NOTICE 'Usuário órfão removido do Auth: % (ID: %)', orphaned_user.email, orphaned_user.id;
  END LOOP;
END $$;