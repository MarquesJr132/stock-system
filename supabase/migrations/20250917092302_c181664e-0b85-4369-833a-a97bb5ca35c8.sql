-- Criar trigger para validar limites de usuários antes de inserir perfis
CREATE OR REPLACE FUNCTION validate_user_limit_before_insert()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela profiles
CREATE TRIGGER validate_user_limit_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_limit_before_insert();

-- Criar função para validar limites de espaço antes de inserir dados
CREATE OR REPLACE FUNCTION validate_space_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  tenant_uuid UUID;
  current_space_usage NUMERIC;
  space_limit INTEGER;
  estimated_new_size NUMERIC;
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
$$ LANGUAGE plpgsql;

-- Aplicar triggers de validação de espaço nas tabelas principais
CREATE TRIGGER validate_space_limit_products_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_limit_before_insert();

CREATE TRIGGER validate_space_limit_customers_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_limit_before_insert();

CREATE TRIGGER validate_space_limit_sales_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_limit_before_insert();

CREATE TRIGGER validate_space_limit_quotations_trigger
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_limit_before_insert();

CREATE TRIGGER validate_space_limit_special_orders_trigger
  BEFORE INSERT ON public.special_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_limit_before_insert();

-- Função para corrigir contagens atuais (executar uma vez para limpar dados inconsistentes)
CREATE OR REPLACE FUNCTION fix_tenant_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_record RECORD;
  actual_user_count INTEGER;
  actual_space_usage NUMERIC;
BEGIN
  -- Para cada tenant, recalcular os valores corretos
  FOR tenant_record IN 
    SELECT DISTINCT tenant_id FROM public.tenant_limits
  LOOP
    -- Contar usuários reais
    SELECT COUNT(*) INTO actual_user_count
    FROM public.profiles 
    WHERE COALESCE(tenant_id, id) = tenant_record.tenant_id
      AND role IN ('user', 'gerente', 'administrator');
    
    -- Calcular espaço real
    SELECT public.estimate_tenant_space_usage(tenant_record.tenant_id) 
    INTO actual_space_usage;
    
    -- Atualizar com valores corretos
    UPDATE public.tenant_limits 
    SET 
      current_total_users = actual_user_count,
      current_month_space_usage_mb = actual_space_usage,
      updated_at = NOW()
    WHERE tenant_id = tenant_record.tenant_id;
    
    RAISE NOTICE 'Fixed tenant % - Users: %, Space: %MB', 
      tenant_record.tenant_id, actual_user_count, actual_space_usage;
  END LOOP;
END;
$function$;