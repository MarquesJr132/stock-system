INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id, created_by)
SELECT 
  'e7adfe04-cf7f-4c41-baee-00f42ed18b26',
  'ko@gmail.com', 
  'ko',
  'user',
  (SELECT COALESCE(tenant_id, id) FROM profiles WHERE role = 'administrator' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'administrator' LIMIT 1);