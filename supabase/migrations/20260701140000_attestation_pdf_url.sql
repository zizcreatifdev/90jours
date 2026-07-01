-- Ajout colonne pdf_url + contrainte UNIQUE certificate_number + bucket attestations

ALTER TABLE public.attestations
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

ALTER TABLE public.attestations
  ADD CONSTRAINT attestations_certificate_number_key UNIQUE (certificate_number);

INSERT INTO storage.buckets (id, name, public)
VALUES ('attestations', 'attestations', true)
ON CONFLICT DO NOTHING;

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
