-- Primeiro, corrigir os dados existentes com tenant_id nulo
-- Para administradores, definir tenant_id como o próprio id
UPDATE public.profiles 
SET tenant_id = id 
WHERE tenant_id IS NULL AND role = 'administrator';

-- Para usuários normais sem tenant_id, precisamos de uma estratégia
-- Por segurança, vamos marcar como órfãos e definir um tenant padrão temporário
-- ou atribuir ao primeiro administrador encontrado
UPDATE public.profiles 
SET tenant_id = (
  SELECT id FROM public.profiles 
  WHERE role = 'administrator' 
  LIMIT 1
)
WHERE tenant_id IS NULL AND role != 'administrator' AND role != 'superuser';

-- Para superusers, manter nulo é válido
-- Agora podemos tornar tenant_id obrigatório com exceção para superusers
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tenant_id_check 
CHECK (tenant_id IS NOT NULL OR role = 'superuser');