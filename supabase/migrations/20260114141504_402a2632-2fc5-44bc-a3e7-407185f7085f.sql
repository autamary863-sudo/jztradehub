-- Clean up duplicate/conflicting policies on app_settings
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can view app_settings" ON public.app_settings;