-- Migration: add formateur feedback column to brief_submissions
-- Allows staff to leave inline feedback on each student's submission.
-- The student sees it directly in their briefs panel (StudentBriefs.tsx).

ALTER TABLE public.brief_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT;
