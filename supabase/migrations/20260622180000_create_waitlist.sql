-- Migration : module liste d'attente
-- Timestamp : 20260622180000

-- ─── Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  formation_id    UUID NULL REFERENCES public.formations(id) ON DELETE SET NULL,
  formation_other TEXT NULL,
  message         TEXT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'contacted', 'converted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS waitlist_status_idx     ON public.waitlist (status);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Public insert (anon + authenticated)
CREATE POLICY "Waitlist public insert"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Super-admin full access
CREATE POLICY "Waitlist super_admin select"
  ON public.waitlist
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Waitlist super_admin update"
  ON public.waitlist
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Waitlist super_admin delete"
  ON public.waitlist
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));
