-- Adicionar colunas para limite de usuários na tabela tenant_limits
ALTER TABLE public.tenant_limits 
ADD COLUMN monthly_user_limit INTEGER NOT NULL DEFAULT 10,
ADD COLUMN current_month_users INTEGER NOT NULL DEFAULT 0;

-- Criar função para verificar limite de usuários
CREATE OR REPLACE FUNCTION public.check_user_limit(tenant_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Se não existe registro, criar um padrão
  IF NOT FOUND THEN
    INSERT INTO public.tenant_limits (tenant_id, created_by) 
    VALUES (tenant_uuid, tenant_uuid);
    RETURN true;
  END IF;
  
  -- Verificar se pode criar mais usuários
  IF current_user_count >= current_user_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Criar função para incrementar contador de usuários
CREATE OR REPLACE FUNCTION public.increment_user_count(tenant_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.tenant_limits 
  SET current_month_users = current_month_users + 1
  WHERE tenant_id = tenant_uuid;
  
  RETURN true;
END;
$$;

-- Atualizar função de reset mensal para incluir usuários
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.tenant_limits 
  SET 
    current_month_usage = 0,
    current_month_users = 0,
    limit_period_start = CURRENT_DATE,
    updated_at = NOW()
  WHERE limit_period_start < (CURRENT_DATE - INTERVAL '1 month');
END;
$$;

-- Criar trigger para rastrear criação de usuários
CREATE OR REPLACE FUNCTION public.log_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Registrar criação de usuário apenas se for role 'user'
  IF NEW.role = 'user' AND NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.data_usage_log (tenant_id, data_type, action_type, created_by)
    VALUES (NEW.tenant_id, 'user', 'create', NEW.created_by);
    
    -- Incrementar contador de usuários
    PERFORM public.increment_user_count(NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para usuários
CREATE TRIGGER log_user_creation_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_creation();