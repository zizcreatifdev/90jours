
-- Table for hero carousel slides
CREATE TABLE public.hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hero slides"
  ON public.hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage hero slides"
  ON public.hero_slides FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
