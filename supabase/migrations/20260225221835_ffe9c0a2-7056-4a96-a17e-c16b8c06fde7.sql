
-- Add signature and stamp image URLs to formations
ALTER TABLE public.formations
ADD COLUMN attestation_signature_url text,
ADD COLUMN attestation_stamp_url text;

-- Create attestations table to track issued certificates
CREATE TABLE public.attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL,
  certificate_number text NOT NULL DEFAULT ('ATT-' || substr(gen_random_uuid()::text, 1, 8))
);

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all attestations
CREATE POLICY "Admins can manage attestations"
ON public.attestations FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Staff can view attestations
CREATE POLICY "Staff can view attestations"
ON public.attestations FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Students can view their own attestations
CREATE POLICY "Students can view own attestations"
ON public.attestations FOR SELECT
USING (auth.uid() = user_id);

-- Unique constraint: one attestation per student per cohort
ALTER TABLE public.attestations ADD CONSTRAINT unique_user_cohort_attestation UNIQUE (user_id, cohort_id);
