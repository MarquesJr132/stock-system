-- Create trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  default_tenant_id UUID;
  user_role app_role;
BEGIN
  -- Get role from metadata or default to 'user'
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'::app_role);
  
  -- Get default tenant (first administrator's tenant)
  SELECT COALESCE(tenant_id, id) INTO default_tenant_id
  FROM public.profiles 
  WHERE role = 'administrator' 
  LIMIT 1;

  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN user_role = 'administrator'::app_role THEN 'administrator'::user_role
      WHEN user_role = 'superuser'::app_role THEN 'superuser'::user_role
      WHEN user_role = 'gerente'::app_role THEN 'gerente'::user_role
      WHEN user_role = 'staff'::app_role THEN 'staff'::user_role
      ELSE 'user'::user_role
    END,
    CASE 
      WHEN user_role = 'administrator'::app_role THEN NULL
      ELSE default_tenant_id
    END,
    NEW.id
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (
    NEW.id,
    user_role,
    CASE 
      WHEN user_role = 'administrator'::app_role THEN NULL
      ELSE default_tenant_id
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile/role for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Temporarily disable user limit trigger for backfill
ALTER TABLE public.profiles DISABLE TRIGGER validate_user_limit_trigger;

-- Backfill existing users without profiles
DO $$
DECLARE
  default_tenant_id UUID;
  admin_profile_id UUID;
  user_record RECORD;
  backfilled_count INTEGER := 0;
BEGIN
  -- Get default tenant and admin profile
  SELECT COALESCE(tenant_id, id), id INTO default_tenant_id, admin_profile_id
  FROM public.profiles 
  WHERE role = 'administrator' 
  LIMIT 1;
  
  -- Insert missing profiles
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE p.user_id IS NULL
  LOOP
    INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, created_by)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
      'user'::user_role,
      default_tenant_id,
      COALESCE(admin_profile_id, user_record.id)
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert into user_roles
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (
      user_record.id,
      'user'::app_role,
      default_tenant_id
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    backfilled_count := backfilled_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % profiles and roles for existing users', backfilled_count;
END $$;

-- Re-enable user limit trigger
ALTER TABLE public.profiles ENABLE TRIGGER validate_user_limit_trigger;

-- Sync tenant user counts after backfill
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id
    FROM public.profiles 
    WHERE role = 'administrator'
  LOOP
    PERFORM public.sync_tenant_space_usage(tenant_record.tenant_id);
  END LOOP;
END $$;