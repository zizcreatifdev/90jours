-- Correction indicatif : +225 (Cote d'Ivoire) -> +221 (Senegal)
ALTER TABLE public.site_settings
  ALTER COLUMN footer_phone SET DEFAULT '+221 77 000 00 00';

UPDATE public.site_settings
  SET footer_phone = '+221 77 000 00 00'
  WHERE footer_phone = '+225 07 00 00 00 00';
