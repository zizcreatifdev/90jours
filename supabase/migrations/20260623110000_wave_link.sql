-- Lien de paiement Wave editable depuis l'administration.
-- Ajoute site_settings.wave_payment_url avec pour valeur par defaut le lien
-- marchand historique. Le code lit cette valeur avec repli sur ce meme lien.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS wave_payment_url TEXT
  DEFAULT 'https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/';

UPDATE public.site_settings
  SET wave_payment_url = 'https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/'
  WHERE wave_payment_url IS NULL;
