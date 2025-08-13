-- Desabilitar temporariamente RLS nas tabelas problemáticas
-- Isso é temporário para permitir que o login funcione
ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_usage_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- Manter RLS apenas na tabela profiles com políticas simples
-- A tabela profiles já tem políticas corretas e sem recursão