-- Atualizar o tenant_id do usuário jotinha para o tenant do administrador
UPDATE public.profiles 
SET tenant_id = 'ddf26536-0fc2-40d7-9cdd-cc6172d300a9', 
    updated_at = NOW()
WHERE email = 'jotinha12345678900@gmail.com';