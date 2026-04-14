-- Migration prompt-25 : champ description sur contract_templates
-- Permet à l'admin d'identifier rapidement le type de contrat dans la liste.

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS description TEXT;
