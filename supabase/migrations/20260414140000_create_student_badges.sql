-- Migration: student_badges table (NH-01)
-- Stores achievements/badges earned by students.
-- badge_type is constrained to known values by the application.
-- UNIQUE(user_id, badge_type) prevents duplicate badge awards.

CREATE TABLE IF NOT EXISTS public.student_badges (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT        NOT NULL,
  earned_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata   JSONB       DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_type)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Students can view their own badges
CREATE POLICY "student_badges_select_own"
  ON public.student_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Students can award themselves badges (logic enforced in the hook)
CREATE POLICY "student_badges_insert_own"
  ON public.student_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view any badge (for future reporting)
CREATE POLICY "student_badges_select_admin"
  ON public.student_badges FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ── Index for fast lookups by user ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS student_badges_user_id_idx ON public.student_badges (user_id);
