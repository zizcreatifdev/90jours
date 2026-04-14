
-- Create site_settings table for admin-configurable settings like hero image
CREATE TABLE public.site_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  hero_image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can update site settings"
  ON public.site_settings FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.site_settings (id) VALUES ('default');

-- Create hero-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true);

CREATE POLICY "Anyone can view hero images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Super admins can upload hero images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update hero images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete hero images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));
