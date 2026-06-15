-- Drop foreign key constraints that prevent manual inserts
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Now insert the profile
INSERT INTO public.profiles (id, display_name)
VALUES ('f5f83960-0b86-4aee-a8c2-0438a40e6681', 'Joshua Moses')
ON CONFLICT (id) DO UPDATE SET display_name = 'Joshua Moses';

-- Add all roles for admin access
INSERT INTO public.user_roles (user_id, role) 
VALUES 
  ('f5f83960-0b86-4aee-a8c2-0438a40e6681', 'buyer'),
  ('f5f83960-0b86-4aee-a8c2-0438a40e6681', 'seller'),
  ('f5f83960-0b86-4aee-a8c2-0438a40e6681', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;