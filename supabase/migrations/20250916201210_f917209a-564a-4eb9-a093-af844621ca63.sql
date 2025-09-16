INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
VALUES (
  'e7adfe04-cf7f-4c41-baee-00f42ed18b26',
  'ko@gmail.com', 
  'ko',
  'user',
  (SELECT tenant_id FROM profiles WHERE role IN ('administrator', 'superuser') LIMIT 1)
);