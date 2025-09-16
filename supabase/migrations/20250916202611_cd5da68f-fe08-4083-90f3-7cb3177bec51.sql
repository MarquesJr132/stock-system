-- Phase 1: Create profiles for all orphaned users
INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, created_by)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'user'::user_role,
  (SELECT COALESCE(tenant_id, id) FROM profiles WHERE role = 'administrator' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'administrator' LIMIT 1)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
  AND u.email IN (
    'testeusss@gmail.com',
    'testeuss@gmail.com', 
    'testeus@gmail.com',
    'testeusuario@gmail.com',
    'tj@gmail.com',
    'last@gmail.com',
    'final@gmail.com',
    'sikatest@gmail.com'
  );

-- Phase 2: Fix the handle_new_user trigger to properly assign tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the first administrator's tenant_id as default
  SELECT COALESCE(tenant_id, id) INTO default_tenant_id
  FROM public.profiles 
  WHERE role = 'administrator' 
  LIMIT 1;

  -- Insert profile with proper tenant assignment
  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user') = 'administrator'
      THEN NULL -- Will be set by set_administrator_tenant trigger
      ELSE default_tenant_id -- Assign to default tenant for regular users
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Phase 3: Create monitoring function to detect and fix orphaned users
CREATE OR REPLACE FUNCTION public.fix_orphaned_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_tenant_id UUID;
  orphaned_count INTEGER;
BEGIN
  -- Get default tenant
  SELECT COALESCE(tenant_id, id) INTO default_tenant_id
  FROM public.profiles 
  WHERE role = 'administrator' 
  LIMIT 1;
  
  -- Count orphaned users
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  WHERE p.user_id IS NULL;
  
  -- Fix orphaned users by creating profiles
  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, created_by)
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    'user'::user_role,
    default_tenant_id,
    (SELECT id FROM profiles WHERE role = 'administrator' LIMIT 1)
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  WHERE p.user_id IS NULL;
  
  -- Log the fix
  RAISE NOTICE 'Fixed % orphaned users', orphaned_count;
END;
$$;

-- Phase 4: Create alert function for prevention
CREATE OR REPLACE FUNCTION public.check_orphaned_users()
RETURNS TABLE(orphaned_count bigint, orphaned_emails text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as orphaned_count,
    ARRAY_AGG(u.email) as orphaned_emails
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  WHERE p.user_id IS NULL;
END;
$$;

-- Create notification for orphaned users
CREATE OR REPLACE FUNCTION public.notify_orphaned_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Check for orphaned users 5 minutes after user creation
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  WHERE p.user_id IS NULL 
    AND u.created_at < NOW() - INTERVAL '5 minutes';
  
  -- Create notification if orphaned users found
  IF orphaned_count > 0 THEN
    INSERT INTO public.notifications (
      tenant_id,
      title,
      message,
      type,
      priority
    )
    SELECT 
      COALESCE(tenant_id, id),
      'Utilizadores Órfãos Detectados',
      'Foram detectados ' || orphaned_count || ' utilizadores sem perfil. Execute fix_orphaned_users() para corrigir.',
      'system_alert',
      'high'
    FROM public.profiles 
    WHERE role = 'administrator' 
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;