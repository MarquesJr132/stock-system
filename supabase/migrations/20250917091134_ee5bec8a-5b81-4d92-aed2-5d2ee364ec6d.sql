-- Create available_features table to define all possible features
CREATE TABLE public.available_features (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  parent_feature TEXT REFERENCES public.available_features(code),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_features table to track which features each tenant has
CREATE TABLE public.tenant_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  feature_code TEXT NOT NULL REFERENCES public.available_features(code),
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_code)
);

-- Enable RLS
ALTER TABLE public.available_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for available_features
CREATE POLICY "Anyone can view available features" 
ON public.available_features 
FOR SELECT 
USING (true);

CREATE POLICY "Superusers can manage available features" 
ON public.available_features 
FOR ALL 
USING (is_superuser())
WITH CHECK (is_superuser());

-- RLS Policies for tenant_features
CREATE POLICY "Users can view their tenant features" 
ON public.tenant_features 
FOR SELECT 
USING (tenant_id = get_current_user_tenant());

CREATE POLICY "Superusers can manage all tenant features" 
ON public.tenant_features 
FOR ALL 
USING (is_superuser())
WITH CHECK (is_superuser());

-- Insert all available features
INSERT INTO public.available_features (code, name, description, category) VALUES 
-- Dashboard features
('dashboard_full', 'Dashboard Completo', 'Acesso completo ao dashboard com todas as funcionalidades', 'dashboard'),
('dashboard_basic', 'Dashboard Básico', 'Dashboard básico apenas com métricas essenciais', 'dashboard'),
('dashboard_analytics', 'Análises do Dashboard', 'Gráficos de evolução de vendas e analytics', 'dashboard'),
('dashboard_payment_methods', 'Métodos de Pagamento', 'Gráfico de métodos de pagamento', 'dashboard'),
('dashboard_abc_analysis', 'Análise ABC', 'Análise ABC de produtos', 'dashboard'),
('dashboard_intelligent_alerts', 'Alertas Inteligentes', 'Sistema de alertas inteligentes', 'dashboard'),
('dashboard_goals', 'Metas de Negócio', 'Gestão de metas e objetivos', 'dashboard'),
('dashboard_stock_alerts', 'Alertas de Stock', 'Notificações de stock baixo', 'dashboard'),
('dashboard_distribution', 'Distribuição de Stock', 'Gráficos de distribuição por categoria', 'dashboard'),

-- Management features
('products_management', 'Gestão de Produtos', 'Criar, editar e eliminar produtos', 'management'),
('products_view_only', 'Visualização de Produtos', 'Apenas visualizar produtos', 'management'),
('customers_management', 'Gestão de Clientes', 'Gestão completa de clientes', 'management'),
('sales_management', 'Gestão de Vendas', 'Gestão completa de vendas', 'management'),
('quotations_management', 'Gestão de Orçamentos', 'Criar e gerir orçamentos', 'management'),
('special_orders', 'Encomendas Especiais', 'Sistema de encomendas especiais', 'management'),
('suppliers_management', 'Gestão de Fornecedores', 'Gestão de fornecedores', 'management'),
('purchase_orders', 'Ordens de Compra', 'Sistema de ordens de compra', 'management'),

-- Reports features
('reports_basic', 'Relatórios Básicos', 'Relatórios básicos de vendas e stock', 'reports'),
('reports_advanced', 'Relatórios Avançados', 'Relatórios avançados com filtros e analytics', 'reports'),
('reports_export', 'Exportação de Relatórios', 'Exportar relatórios em PDF/Excel', 'reports'),

-- Business features
('business_analytics', 'Análises de Negócio', 'Métricas avançadas de negócio', 'business'),
('business_promotions', 'Gestão de Promoções', 'Sistema de promoções e descontos', 'business'),
('business_stock_movements', 'Movimentos de Stock', 'Histórico detalhado de movimentos', 'business'),

-- Administration features
('user_management', 'Gestão de Utilizadores', 'Gestão de utilizadores do tenant', 'administration'),
('company_settings', 'Configurações da Empresa', 'Configurações e dados da empresa', 'administration'),
('audit_logs', 'Logs de Auditoria', 'Histórico de ações e auditoria', 'administration'),
('integrations', 'Integrações', 'Gestão de integrações externas', 'administration'),

-- System features
('backup_system', 'Sistema de Backup', 'Backup e restore de dados', 'system'),
('global_search', 'Pesquisa Global', 'Pesquisa avançada em toda a aplicação', 'system');

-- Create function to check if tenant has feature
CREATE OR REPLACE FUNCTION public.tenant_has_feature(tenant_uuid uuid, feature_code_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_features 
    WHERE tenant_id = tenant_uuid 
      AND feature_code = feature_code_param 
      AND enabled = true 
      AND (expires_at IS NULL OR expires_at > CURRENT_DATE)
  );
END;
$$;

-- Create function to get current user tenant features
CREATE OR REPLACE FUNCTION public.get_user_tenant_features()
RETURNS TABLE(feature_code text, name text, category text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  user_tenant_id := get_current_user_tenant();
  
  RETURN QUERY
  SELECT 
    af.code,
    af.name,
    af.category
  FROM public.available_features af
  INNER JOIN public.tenant_features tf ON af.code = tf.feature_code
  WHERE tf.tenant_id = user_tenant_id 
    AND tf.enabled = true 
    AND (tf.expires_at IS NULL OR tf.expires_at > CURRENT_DATE);
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_available_features_updated_at
BEFORE UPDATE ON public.available_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_features_updated_at
BEFORE UPDATE ON public.tenant_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();