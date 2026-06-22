-- ============================================================================
-- MIGRATION_PAIEMENT_TRANCHES.sql
-- A coller dans le SQL Editor de Supabase, executer en une fois.
-- ============================================================================
--
-- Paiement par tranches parametrables par formation (etape A : base + admin).
--
-- Modele : inscription (toujours en premier) + cout de formation payable en
-- 1 ou 2 tranches max. Le grand total tout compris est total_price.
--   montant du total       = total_price
--   cout formation (hors inscription) = total_price - registration_fee
--                                     = tranche_1_amount + tranche_2_amount
--
-- Ce que fait cette migration :
--   1. formations : ajoute tranche_1_amount et tranche_2_amount
--   2. backfill coherent des formations existantes (somme = total_price)
--   3. contrainte d'integrite : registration_fee + t1 + t2 = total_price
--   4. payments.payment_type : remplace la contrainte CHECK pour autoriser
--      inscription / tranche_1 / tranche_2 / formation_complete
--      ('formation' conserve pour compatibilite des paiements deja saisis)
-- ============================================================================

BEGIN;

-- ── 1. Colonnes des tranches sur formations ─────────────────────────────────
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS tranche_1_amount integer NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS tranche_2_amount integer NOT NULL DEFAULT 20000;

-- ── 2. Backfill coherent des formations existantes ──────────────────────────
-- Le cout de formation hors inscription (total_price - registration_fee) est
-- reparti en deux tranches. La tranche 2 absorbe le reste impair pour garantir
-- registration_fee + tranche_1 + tranche_2 = total_price sur chaque ligne.
UPDATE public.formations
SET
  tranche_1_amount = FLOOR((total_price - registration_fee) / 2.0),
  tranche_2_amount = (total_price - registration_fee) - FLOOR((total_price - registration_fee) / 2.0);

-- ── 3. Contrainte d'integrite financiere ────────────────────────────────────
-- registration_fee + tranche_1 + tranche_2 doit egaler total_price (grand total).
ALTER TABLE public.formations
  DROP CONSTRAINT IF EXISTS formations_tranches_sum_check;
ALTER TABLE public.formations
  ADD CONSTRAINT formations_tranches_sum_check
  CHECK (registration_fee + tranche_1_amount + tranche_2_amount = total_price);

-- ── 4. Types de paiement ────────────────────────────────────────────────────
-- L'ancienne contrainte inline auto-nommee est payments_payment_type_check.
-- On la remplace sans toucher la migration d'origine.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('inscription', 'tranche_1', 'tranche_2', 'formation_complete', 'formation'));

COMMIT;
