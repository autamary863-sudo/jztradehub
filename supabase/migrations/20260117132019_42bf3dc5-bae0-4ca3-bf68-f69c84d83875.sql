-- Fix app_settings RLS to allow public read access for essential settings
DROP POLICY IF EXISTS "Only admins can read app settings" ON public.app_settings;

-- Allow anyone to read essential public settings (maintenance_mode, site_alert, ad_slides)
CREATE POLICY "Anyone can read public app settings" 
ON public.app_settings 
FOR SELECT 
USING (
  key IN ('maintenance_mode', 'site_alert', 'ad_slides')
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);