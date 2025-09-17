-- Fix security linter: add SET search_path for our new functions
CREATE OR REPLACE FUNCTION public.validate_user_limit_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  user_tenant_id UUID;
  current_user_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Determinar o tenant_id para o novo usuário
  user_tenant_id := COALESCE(NEW.tenant_id, NEW.id);
  
  -- Pular validação para superusuários
  IF NEW.role = 'superuser' THEN
    RETURN NEW;
  END IF;
  
  -- Pular validação para administradores que serão seus próprios tenants
  IF NEW.role = 'administrator' AND NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar contagem atual e limite de usuários
  SELECT current_total_users, total_user_limit 
  INTO current_user_count, user_limit
  FROM public.tenant_limits 
  WHERE tenant_id = user_tenant_id;
  
  -- Se não existe registro de limites, inicializar
  IF NOT FOUND THEN
    PERFORM public.initialize_tenant_limits(user_tenant_id);
    SELECT current_total_users, total_user_limit 
    INTO current_user_count, user_limit
    FROM public.tenant_limits 
    WHERE tenant_id = user_tenant_id;
  END IF;
  
  -- Validar se pode criar mais usuários
  IF current_user_count >= user_limit THEN
    RAISE EXCEPTION 'Limite de usuários excedido para este tenant. Atual: %, Limite: %', 
      current_user_count, user_limit;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_space_limit_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  tenant_uuid UUID;
  current_space_usage NUMERIC;
  space_limit INTEGER;
  table_avg_size NUMERIC;
BEGIN
  -- Determinar tenant_id
  tenant_uuid := NEW.tenant_id;
  
  -- Buscar uso atual e limite de espaço
  SELECT current_month_space_usage_mb, monthly_space_limit_mb 
  INTO current_space_usage, space_limit
  FROM public.tenant_limits 
  WHERE tenant_id = tenant_uuid;
  
  -- Se não existe registro, inicializar
  IF NOT FOUND THEN
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    SELECT current_month_space_usage_mb, monthly_space_limit_mb 
    INTO current_space_usage, space_limit
    FROM public.tenant_limits 
    WHERE tenant_id = tenant_uuid;
  END IF;
  
  -- Estimar tamanho do novo registro baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'products' THEN table_avg_size := 1.0; -- 1MB estimado por produto
    WHEN 'customers' THEN table_avg_size := 0.5; -- 0.5MB estimado por cliente
    WHEN 'sales' THEN table_avg_size := 0.25; -- 0.25MB estimado por venda
    WHEN 'sale_items' THEN table_avg_size := 0.125; -- 0.125MB estimado por item
    WHEN 'quotations' THEN table_avg_size := 0.25;
    WHEN 'quotation_items' THEN table_avg_size := 0.125;
    WHEN 'special_orders' THEN table_avg_size := 0.25;
    WHEN 'suppliers' THEN table_avg_size := 0.5;
    WHEN 'purchase_orders' THEN table_avg_size := 0.25;
    ELSE table_avg_size := 0.1; -- Padrão para outras tabelas
  END CASE;
  
  -- Verificar se adicionando este registro excederia o limite
  IF (current_space_usage + table_avg_size) > space_limit THEN
    RAISE EXCEPTION 'Limite de espaço excedido para este tenant. Uso atual: %MB, Limite: %MB, Novo registro: %MB', 
      current_space_usage, space_limit, table_avg_size;
  END IF;
  
  RETURN NEW;
END;
$$;