-- ============================================================
-- MIGRATION_ATTESTATION_PDF.sql
-- A executer dans le dashboard Supabase (SQL Editor) ou via CLI.
--
-- Contenu :
--   1. Ajout colonne pdf_url sur attestations
--   2. Contrainte UNIQUE sur certificate_number (AMELIO-3)
--   3. Bucket de stockage "attestations" (public)
--   4. Politiques RLS du bucket (lecture publique, ecriture super_admin)
-- ============================================================

-- 1. Ajouter pdf_url (nullable, remplie a l'emission)
ALTER TABLE public.attestations
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Contrainte UNIQUE sur certificate_number
--    Le DEFAULT genere deja des valeurs quasi-uniques ; on formalise la contrainte.
ALTER TABLE public.attestations
  ADD CONSTRAINT attestations_certificate_number_key UNIQUE (certificate_number);

-- 3. Bucket de stockage des PDFs d'attestations (public = URLs lisibles sans auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attestations', 'attestations', true)
ON CONFLICT DO NOTHING;

-- 4a. Autoriser super_admin a uploader les PDFs
CREATE POLICY IF NOT EXISTS "Super admin can insert attestation PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attestations'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 4b. Autoriser super_admin a remplacer les PDFs existants (upsert)
CREATE POLICY IF NOT EXISTS "Super admin can update attestation PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attestations'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Note : la lecture est publique (bucket public = true).
-- Les politiques SELECT sur storage.objects ne sont pas necessaires
-- pour les buckets publics (les URLs /storage/v1/object/public/... passent sans auth).
