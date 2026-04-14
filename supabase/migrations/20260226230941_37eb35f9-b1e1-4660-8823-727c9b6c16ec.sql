
-- Add JSONB template column to formations for drag & drop layout
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS attestation_template jsonb DEFAULT NULL;

-- Add status and blocking_reason to attestations for tracking
ALTER TABLE public.attestations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issued';
ALTER TABLE public.attestations ADD COLUMN IF NOT EXISTS blocking_reason text DEFAULT NULL;

-- Create attestation_actions table for history tracking
CREATE TABLE public.attestation_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attestation_id uuid REFERENCES public.attestations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text DEFAULT NULL,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attestation_actions ENABLE ROW LEVEL SECURITY;

-- Policies for attestation_actions
CREATE POLICY "Admins can manage attestation actions"
  ON public.attestation_actions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can view attestation actions"
  ON public.attestation_actions FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Students can view own attestation actions"
  ON public.attestation_actions FOR SELECT
  USING (auth.uid() = user_id);
