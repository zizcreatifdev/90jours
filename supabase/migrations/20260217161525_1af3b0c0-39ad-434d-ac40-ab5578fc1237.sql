
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'Formez-vous en 90 jours',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_email TEXT DEFAULT 'info@90jours.com',
  ADD COLUMN IF NOT EXISTS footer_phone TEXT DEFAULT '+225 07 00 00 00 00',
  ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT 'Des formations intensives qui transforment votre créativité en 90 jours.';
