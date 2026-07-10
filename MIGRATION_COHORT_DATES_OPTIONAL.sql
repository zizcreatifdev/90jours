-- Migration : rendre start_date et end_date optionnelles sur les cohortes
-- A executer dans le SQL Editor de Supabase (Dashboard > SQL Editor)
-- Apres execution, regenerer les types TypeScript ou appliquer les correctifs manuels ci-dessous

ALTER TABLE cohorts ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE cohorts ALTER COLUMN end_date   DROP NOT NULL;
