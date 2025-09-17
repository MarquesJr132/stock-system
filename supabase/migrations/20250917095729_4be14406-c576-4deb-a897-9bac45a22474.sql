-- Create the new dashboard_security_notifications feature
INSERT INTO available_features (code, name, description, category) 
VALUES ('dashboard_security_notifications', 'Notificações de Segurança', 'Notificações de segurança e auditoria no dashboard', 'dashboard');

-- Remove all dashboard_full assignments and convert them to individual features
WITH users_with_dashboard_full AS (
  SELECT tenant_id FROM tenant_features WHERE feature_code = 'dashboard_full' AND enabled = true
)
INSERT INTO tenant_features (tenant_id, feature_code, enabled)
SELECT 
  uwdf.tenant_id,
  af.code,
  true
FROM users_with_dashboard_full uwdf
CROSS JOIN available_features af
WHERE af.code IN (
  'dashboard_goals',
  'dashboard_analytics', 
  'dashboard_intelligent_alerts',
  'dashboard_payment_methods',
  'dashboard_abc_analysis',
  'dashboard_stock_alerts',
  'dashboard_distribution',
  'dashboard_security_notifications'
)
ON CONFLICT (tenant_id, feature_code) DO NOTHING;

-- Remove all dashboard_full feature assignments
DELETE FROM tenant_features WHERE feature_code = 'dashboard_full';