-- Corrigir o tenant_id do usuário Rise para o tenant do administrador Carlos
UPDATE public.profiles 
SET tenant_id = '2bb5a3ec-7b9a-4e8a-82dc-e0fa4b059a14', 
    updated_at = NOW()
WHERE email = 'risedaily132@gmail.com';