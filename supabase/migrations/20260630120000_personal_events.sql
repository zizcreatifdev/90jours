-- Migration: personal_events
-- Evenements personnels crees par les etudiants dans leur calendrier.
-- Strictement prives : RLS = seulement le proprietaire voit et gere ses evenements.

-- Table

CREATE TABLE IF NOT EXISTS public.personal_events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  event_date   DATE        NOT NULL,
  event_time   TIME,
  color        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS : uniquement le proprietaire

ALTER TABLE public.personal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_events_own"
  ON public.personal_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes

CREATE INDEX IF NOT EXISTS personal_events_user_id_idx   ON public.personal_events (user_id);
CREATE INDEX IF NOT EXISTS personal_events_event_date_idx ON public.personal_events (event_date);

-- Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_events;
