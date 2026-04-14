
-- Create formations table
CREATE TABLE public.formations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  deliverable_label TEXT NOT NULL DEFAULT 'Portfolio',
  deliverable_description TEXT,
  attestation_title TEXT,
  attestation_body TEXT,
  attestation_logo_url TEXT,
  attestation_color TEXT DEFAULT '#1a1a2e',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active formations
CREATE POLICY "Anyone can view active formations"
ON public.formations FOR SELECT
USING (is_active = true);

-- Admins can manage all formations
CREATE POLICY "Admins can manage formations"
ON public.formations FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add formation_id to cohorts
ALTER TABLE public.cohorts ADD COLUMN formation_id UUID REFERENCES public.formations(id);

-- Add formation_id to portfolios for clarity
ALTER TABLE public.portfolios ADD COLUMN formation_id UUID REFERENCES public.formations(id);

-- Trigger for updated_at
CREATE TRIGGER update_formations_updated_at
BEFORE UPDATE ON public.formations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with initial formation
INSERT INTO public.formations (name, slug, description, deliverable_label, deliverable_description, attestation_title, attestation_body, attestation_color)
VALUES (
  '90 jours en graphisme',
  'graphisme',
  'La formation intensive qui transforme votre créativité en 90 jours.',
  'Portfolio',
  'Soumettez le lien de votre portfolio de fin de formation.',
  'Attestation de formation en Graphisme',
  'Nous certifions que {student_name} a suivi avec succès la formation "90 jours en graphisme" et a validé l''ensemble des livrables requis.',
  '#1a1a2e'
);
