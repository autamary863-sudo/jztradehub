-- Create app_settings table for site-wide settings
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view settings (needed for maintenance mode, alerts, etc.)
CREATE POLICY "Anyone can view app_settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('maintenance_mode', '{"enabled": false, "message": "Site is under maintenance. Please check back later."}'),
  ('site_alert', '{"enabled": false, "message": "", "type": "info"}'),
  ('ad_slides', '{"enabled": false, "slides": []}');

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Fix user_roles: Allow users to give themselves seller role when becoming a seller
CREATE POLICY "Users can add seller role to themselves"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'seller'::app_role
);