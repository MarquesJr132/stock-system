-- Create company_settings table for tenant-specific company information
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Sistema de Gestão de Stock Lda.',
  address TEXT DEFAULT 'Maputo, Moçambique',
  phone TEXT DEFAULT '+258 84 123 4567',
  email TEXT DEFAULT 'info@stocksystem.co.mz',
  nuit TEXT DEFAULT '123456789',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own tenant company settings" 
ON public.company_settings 
FOR SELECT 
USING (is_superuser() OR (tenant_id = get_current_user_tenant()));

CREATE POLICY "Administrators can insert own tenant company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (is_superuser() OR (is_administrator() AND (tenant_id = get_current_user_tenant())));

CREATE POLICY "Administrators can update own tenant company settings" 
ON public.company_settings 
FOR UPDATE 
USING (is_superuser() OR (is_administrator() AND (tenant_id = get_current_user_tenant())));

-- Create trigger for updating updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();