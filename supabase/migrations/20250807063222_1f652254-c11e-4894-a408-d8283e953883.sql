-- Create a function that superusers can call to get administrators
CREATE OR REPLACE FUNCTION public.get_administrators()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  role user_role,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id, p.user_id, p.email, p.full_name, p.role, p.tenant_id, p.created_by, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.role = 'administrator'
  ORDER BY p.created_at DESC;
$$;