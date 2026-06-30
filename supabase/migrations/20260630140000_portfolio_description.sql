-- Migration: portfolio_description
-- Ajoute un champ description optionnel a la table portfolios.
-- L'etudiant peut contextualiser son livrable (outils, projets, approche).

ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS description TEXT;
