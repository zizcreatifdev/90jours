-- ============================================================================
-- MIGRATION_WAVE_LINK.sql
-- A coller dans le SQL Editor de Supabase, executer en une fois.
-- ============================================================================
--
-- Rend le lien de paiement Wave editable depuis l'administration.
--
-- Avant : le lien marchand Wave etait code en dur dans le code source
--         (StudentPaymentStatus.tsx et PaymentManager.tsx).
-- Apres : il est stocke dans site_settings.wave_payment_url et modifiable
--         depuis le panneau de reglages du site.
--
-- Le code lit cette valeur avec un repli sur le lien historique si la colonne
-- est vide, donc aucune rupture si la migration n'est pas encore jouee.
-- ============================================================================

BEGIN;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS wave_payment_url TEXT
  DEFAULT 'https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/';

-- Renseigne les lignes existantes restees a NULL.
UPDATE public.site_settings
  SET wave_payment_url = 'https://pay.wave.com/m/M_mahK9UpbVYCm/c/sn/'
  WHERE wave_payment_url IS NULL;

COMMIT;
