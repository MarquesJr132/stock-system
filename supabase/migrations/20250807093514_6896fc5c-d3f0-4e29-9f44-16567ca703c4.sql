-- Fix the check_data_limit function to properly enforce limits
CREATE OR REPLACE FUNCTION public.check_data_limit(tenant_uuid uuid, data_type_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Buscar limite atual
  SELECT monthly_data_limit, current_month_usage 
  INTO current_limit, current_usage
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, criar um padrão e permitir
  IF NOT FOUND THEN
    INSERT INTO public.tenant_limits (tenant_id, created_by) 
    VALUES (tenant_uuid, tenant_uuid)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais dados (se já atingiu o limite, retornar false)
  IF current_usage >= current_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Fix the check_user_limit function to properly enforce limits
CREATE OR REPLACE FUNCTION public.check_user_limit(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_limit INTEGER;
  current_user_count INTEGER;
BEGIN
  -- Buscar limite atual de usuários
  SELECT monthly_user_limit, current_month_users 
  INTO current_user_limit, current_user_count
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, criar um padrão e permitir
  IF NOT FOUND THEN
    INSERT INTO public.tenant_limits (tenant_id, created_by) 
    VALUES (tenant_uuid, tenant_uuid)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais usuários (se já atingiu o limite, retornar false)
  IF current_user_count >= current_user_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;