-- Clean up dashboard_full feature permanently
DELETE FROM tenant_features WHERE feature_code = 'dashboard_full';
DELETE FROM available_features WHERE code = 'dashboard_full';