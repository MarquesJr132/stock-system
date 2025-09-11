-- Criar a função check_space_limit se não existir
CREATE OR REPLACE FUNCTION public.check_space_limit(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_space_limit_mb INTEGER;
  current_space_usage_mb NUMERIC;
BEGIN
  -- Buscar limite atual de espaço
  SELECT monthly_space_limit_mb, current_month_space_usage_mb 
  INTO current_space_limit_mb, current_space_usage_mb
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, criar um padrão e permitir
  IF NOT FOUND THEN
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode usar mais espaço (se já atingiu o limite, retornar false)
  IF current_space_usage_mb >= current_space_limit_mb THEN
    RAISE NOTICE 'Space limit exceeded for tenant %. Current: %MB, Limit: %MB', 
      tenant_uuid, current_space_usage_mb, current_space_limit_mb;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;