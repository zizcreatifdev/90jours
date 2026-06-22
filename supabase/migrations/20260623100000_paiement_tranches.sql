-- Paiement par tranches parametrables par formation (etape A : base + admin).
--
-- Modele : inscription + cout de formation payable en 1 ou 2 tranches max.
-- Le grand total tout compris est total_price :
--   montant du total = total_price
--   cout formation (hors inscription) = total_price - registration_fee
--                                     = tranche_1_amount + tranche_2_amount

-- ── 1. Colonnes des tranches sur formations ─────────────────────────────────
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS tranche_1_amount integer NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS tranche_2_amount integer NOT NULL DEFAULT 20000;

-- ── 2. Backfill coherent des formations existantes ──────────────────────────
-- registration_fee + tranche_1 + tranche_2 = total_price sur chaque ligne.
-- La tranche 2 absorbe le reste impair.
UPDATE public.formations
SET
  tranche_1_amount = FLOOR((total_price - registration_fee) / 2.0),
  tranche_2_amount = (total_price - registration_fee) - FLOOR((total_price - registration_fee) / 2.0);

-- ── 3. Contrainte d'integrite financiere ────────────────────────────────────
ALTER TABLE public.formations
  DROP CONSTRAINT IF EXISTS formations_tranches_sum_check;
ALTER TABLE public.formations
  ADD CONSTRAINT formations_tranches_sum_check
  CHECK (registration_fee + tranche_1_amount + tranche_2_amount = total_price);

-- ── 4. Types de paiement ────────────────────────────────────────────────────
-- Remplace l'ancienne contrainte inline (payments_payment_type_check) pour
-- autoriser les tranches. 'formation' conserve pour compat des saisies passees.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('inscription', 'tranche_1', 'tranche_2', 'formation_complete', 'formation'));
