-- CRITICAL SECURITY FIX: Separate roles table to prevent privilege escalation

-- 1. Create app_role enum
CREATE TYPE app_role AS ENUM ('administrator', 'gerente', 'staff', 'user', 'superuser');

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, tenant_id, created_by)
SELECT 
  user_id, 
  role::text::app_role, 
  tenant_id, 
  created_by 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- 7. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Administrators can view all roles in their tenant"
  ON public.user_roles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') 
    OR has_role(auth.uid(), 'superuser')
    OR has_role(auth.uid(), 'gerente')
  );

CREATE POLICY "Administrators can manage roles"
  ON public.user_roles
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator') 
    OR has_role(auth.uid(), 'superuser')
  );

-- 8. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);