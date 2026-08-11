
-- Correction du prix de la formation graphisme.
-- La valeur enregistree (25 000) etait incorrecte ; le vrai tarif est 60 000 FCFA.
--
-- Contrainte formations_tranches_sum_check :
--   registration_fee + tranche_1_amount + tranche_2_amount = total_price
--   10 000 + 25 000 + 25 000 = 60 000  (satisfait)
--
-- A executer manuellement via le Dashboard Supabase (SQL Editor).
-- Ne pas modifier les lignes existantes : creer toujours une nouvelle migration.

UPDATE public.formations
SET
  total_price      = 60000,
  registration_fee = 10000,
  tranche_1_amount = 25000,
  tranche_2_amount = 25000
WHERE slug = 'graphisme';

-- Verification : lister toutes les formations avec leurs prix apres correction.
-- Decommenter pour audit visuel dans le SQL Editor :
-- SELECT slug, name, total_price, registration_fee, tranche_1_amount, tranche_2_amount
-- FROM public.formations
-- ORDER BY name;
