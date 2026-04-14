
-- Add status column to brief_submissions to differentiate completed vs delivered
ALTER TABLE public.brief_submissions
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

-- completed = réalisé (fait mais pas encore envoyé)
-- delivered = livré (envoyé au formateur)
