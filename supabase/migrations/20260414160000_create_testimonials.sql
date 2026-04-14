-- Migration: testimonials table (prompt-24)
-- Stores testimonials displayed on the landing page.
-- Admins manage visibility and display order.
-- Public users can only read visible testimonials.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  photo_url     TEXT,
  is_visible    BOOLEAN     NOT NULL DEFAULT false,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public: read only visible testimonials
CREATE POLICY "testimonials_select_visible"
  ON public.testimonials FOR SELECT
  USING (is_visible = true);

-- Admins: full access
CREATE POLICY "testimonials_admin_all"
  ON public.testimonials FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ── Index ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS testimonials_display_order_idx
  ON public.testimonials (display_order ASC)
  WHERE is_visible = true;
