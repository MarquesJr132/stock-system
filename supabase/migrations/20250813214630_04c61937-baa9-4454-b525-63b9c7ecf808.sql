-- Implementar sistema completo de controle de limites com criação automática e limpeza

-- 1. Criar função para inicializar limites padrão automaticamente
CREATE OR REPLACE FUNCTION public.initialize_tenant_limits(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir limites padrão se não existirem
  INSERT INTO public.tenant_limits (
    tenant_id,
    monthly_data_limit,
    monthly_user_limit,
    current_month_usage,
    current_month_users,
    created_by,
    limit_period_start
  ) 
  VALUES (
    tenant_uuid,
    1000, -- limite padrão de dados
    10,   -- limite padrão de usuários
    0,    -- uso inicial zerado
    0,    -- usuários inicial zerado
    tenant_uuid,
    date_trunc('month', CURRENT_DATE)::DATE
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  
  RAISE NOTICE 'Initialized default limits for tenant: %', tenant_uuid;
END;
$$;

-- 2. Criar trigger para inicializar limites quando um administrador é criado
CREATE OR REPLACE FUNCTION public.handle_new_administrator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se é um administrador, inicializar os limites automaticamente
  IF NEW.role = 'administrator' THEN
    -- Usar tenant_id se existir, senão usar o próprio id
    PERFORM public.initialize_tenant_limits(COALESCE(NEW.tenant_id, NEW.id));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para administradores
DROP TRIGGER IF EXISTS on_administrator_created ON public.profiles;
CREATE TRIGGER on_administrator_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  WHEN (NEW.role = 'administrator')
  EXECUTE FUNCTION public.handle_new_administrator();

-- 3. Criar função para limpeza completa quando um tenant é removido
CREATE OR REPLACE FUNCTION public.cleanup_tenant_data(tenant_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remover todos os dados relacionados ao tenant
  DELETE FROM public.tenant_limits WHERE tenant_id = tenant_uuid;
  DELETE FROM public.data_usage_log WHERE tenant_id = tenant_uuid;
  DELETE FROM public.sale_items WHERE tenant_id = tenant_uuid;
  DELETE FROM public.sales WHERE tenant_id = tenant_uuid;
  DELETE FROM public.customers WHERE tenant_id = tenant_uuid;
  DELETE FROM public.products WHERE tenant_id = tenant_uuid;
  DELETE FROM public.company_settings WHERE tenant_id = tenant_uuid;
  DELETE FROM public.notifications WHERE tenant_id = tenant_uuid;
  DELETE FROM public.audit_logs WHERE tenant_id = tenant_uuid;
  DELETE FROM public.system_settings WHERE tenant_id = tenant_uuid;
  DELETE FROM public.suppliers WHERE tenant_id = tenant_uuid;
  DELETE FROM public.purchase_orders WHERE tenant_id = tenant_uuid;
  
  -- Remover perfis de usuários do tenant (exceto administrador principal)
  DELETE FROM public.profiles 
  WHERE tenant_id = tenant_uuid 
  AND role != 'administrator';
  
  RAISE NOTICE 'Cleaned up all data for tenant: %', tenant_uuid;
END;
$$;

-- 4. Criar trigger para limpeza automática quando administrador é deletado
CREATE OR REPLACE FUNCTION public.handle_administrator_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se foi um administrador deletado, limpar todos os dados do tenant
  IF OLD.role = 'administrator' AND OLD.tenant_id IS NOT NULL THEN
    PERFORM public.cleanup_tenant_data(OLD.tenant_id);
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar trigger para limpeza
DROP TRIGGER IF EXISTS on_administrator_deleted ON public.profiles;
CREATE TRIGGER on_administrator_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.role = 'administrator')
  EXECUTE FUNCTION public.handle_administrator_deletion();

-- 5. Atualizar função de verificação de limite para ser mais robusta
CREATE OR REPLACE FUNCTION public.check_data_limit(tenant_uuid uuid, data_type_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais dados (se já atingiu o limite, retornar false)
  IF current_usage >= current_limit THEN
    RAISE NOTICE 'Data limit exceeded for tenant %. Current: %, Limit: %', tenant_uuid, current_usage, current_limit;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Atualizar função de verificação de limite de usuários
CREATE OR REPLACE FUNCTION public.check_user_limit(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    PERFORM public.initialize_tenant_limits(tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais usuários (se já atingiu o limite, retornar false)
  IF current_user_count >= current_user_limit THEN
    RAISE NOTICE 'User limit exceeded for tenant %. Current: %, Limit: %', tenant_uuid, current_user_count, current_user_limit;
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 7. Inicializar limites para administradores existentes que não têm limites
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT DISTINCT COALESCE(tenant_id, id) as tenant_id
    FROM public.profiles 
    WHERE role = 'administrator'
    AND COALESCE(tenant_id, id) NOT IN (
      SELECT tenant_id FROM public.tenant_limits
    )
  LOOP
    PERFORM public.initialize_tenant_limits(admin_record.tenant_id);
  END LOOP;
END $$;