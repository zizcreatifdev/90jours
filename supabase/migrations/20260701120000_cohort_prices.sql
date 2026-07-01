-- Ajoute les colonnes de tarification sur la table cohorts.
-- Les formations gardent leurs prix comme modeles par defaut.
-- Ces colonnes sont nullable : NULL signifie "utiliser les valeurs de la formation".

ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS total_price INTEGER,
  ADD COLUMN IF NOT EXISTS registration_fee INTEGER,
  ADD COLUMN IF NOT EXISTS tranche_1_amount INTEGER,
  ADD COLUMN IF NOT EXISTS tranche_2_amount INTEGER;

-- Backfill depuis la formation liee pour toutes les cohortes existantes.
UPDATE cohorts c
  SET total_price      = f.total_price,
      registration_fee = f.registration_fee,
      tranche_1_amount = f.tranche_1_amount,
      tranche_2_amount = f.tranche_2_amount
  FROM formations f
  WHERE c.formation_id = f.id;
