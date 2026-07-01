-- MIGRATION : Tarification par cohorte
-- A executer UNE SEULE FOIS sur la base de production Supabase.
-- Les formations gardent leurs colonnes (total_price, registration_fee,
-- tranche_1_amount, tranche_2_amount) comme modeles de reference.
-- Chaque cohorte peut desormais surcharger ces montants.

ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS total_price INTEGER,
  ADD COLUMN IF NOT EXISTS registration_fee INTEGER,
  ADD COLUMN IF NOT EXISTS tranche_1_amount INTEGER,
  ADD COLUMN IF NOT EXISTS tranche_2_amount INTEGER;

-- Copie les tarifs de la formation vers chaque cohorte existante.
-- Apres cette operation, les cohortes ont leurs propres prix.
UPDATE cohorts c
  SET total_price      = f.total_price,
      registration_fee = f.registration_fee,
      tranche_1_amount = f.tranche_1_amount,
      tranche_2_amount = f.tranche_2_amount
  FROM formations f
  WHERE c.formation_id = f.id;
