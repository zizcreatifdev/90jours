-- ============================================================================
-- MIGRATION RLS : le rôle staff (formateur) peut écrire le feedback des briefs
-- et valider les portfolios.
--
-- A coller dans le SQL Editor Supabase, exécuter en une fois.
--
-- Contexte : aujourd'hui brief_submissions et portfolios n'accordent au rôle
-- staff que le SELECT ; seul super_admin a le FOR ALL. Les écritures des
-- formateurs (feedback de brief, validation de portfolio) sont donc rejetées
-- silencieusement par la RLS. Cette migration AJOUTE deux policies UPDATE
-- dédiées au rôle staff, SANS modifier les policies existantes (students update
-- own, admins manage all, etc.).
--
-- Helper utilisé : public.has_role(auth.uid(), 'staff'::app_role), cohérent
-- avec toutes les autres policies du projet.
-- ============================================================================

BEGIN;

-- ── brief_submissions : feedback formateur ──────────────────────────────────
-- Autorise un staff à mettre à jour les soumissions (colonne feedback, etc.).
-- BriefManager.tsx fait update({ feedback }).eq("id", submissionId).
DROP POLICY IF EXISTS "Staff can update brief submissions" ON public.brief_submissions;
CREATE POLICY "Staff can update brief submissions"
  ON public.brief_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- ── portfolios : validation formateur ───────────────────────────────────────
-- Autorise un staff à valider/rejeter un portfolio (status, admin_notes,
-- validated_at). PortfolioManager.tsx fait update({ status, admin_notes,
-- validated_at }).eq("id", portfolioId).
DROP POLICY IF EXISTS "Staff can validate portfolios" ON public.portfolios;
CREATE POLICY "Staff can validate portfolios"
  ON public.portfolios FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

COMMIT;
