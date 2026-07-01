-- Migration : ajout du flag is_owner sur la table profiles
-- Permet de distinguer le proprietaire (is_owner=true) d'une assistante administrative (super_admin mais is_owner=false)

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- Marque le compte proprietaire comme is_owner=true
UPDATE public.profiles
SET is_owner = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'zizadmin@60jours.sn');

COMMIT;
