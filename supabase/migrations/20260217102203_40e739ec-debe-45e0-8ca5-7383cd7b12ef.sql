
-- Create brief_categories table
CREATE TABLE public.brief_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brief_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.brief_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.brief_categories FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default categories
INSERT INTO public.brief_categories (name) VALUES
  ('Création de logo'),
  ('Création d''affiche'),
  ('Création d''étiquette'),
  ('Création de bannière');

-- Add category_id to briefs
ALTER TABLE public.briefs ADD COLUMN category_id uuid REFERENCES public.brief_categories(id);

-- Add brief_frequency to briefs (daily, weekly, or null for normal)
ALTER TABLE public.briefs ADD COLUMN brief_frequency text;

-- Add cohort_type to cohorts (standard, initiation)
ALTER TABLE public.cohorts ADD COLUMN cohort_type text NOT NULL DEFAULT 'standard';
