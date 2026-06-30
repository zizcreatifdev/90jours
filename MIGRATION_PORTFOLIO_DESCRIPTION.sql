-- ============================================================
-- A coller dans le SQL Editor de votre projet Supabase.
-- Migration : portfolio_description
-- Ajoute un champ description optionnel a la table portfolios.
-- L'etudiant peut contextualiser son livrable (outils, projets, approche).
-- Date : 2026-06-30
-- ============================================================

BEGIN;

ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS description TEXT;

COMMIT;
