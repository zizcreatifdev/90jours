BEGIN;

-- Add submission attachment columns to brief_submissions
ALTER TABLE public.brief_submissions
  ADD COLUMN IF NOT EXISTS submission_url TEXT,
  ADD COLUMN IF NOT EXISTS submission_file_url TEXT;

-- Create storage bucket for brief submission files
INSERT INTO storage.buckets (id, name, public)
VALUES ('brief-submissions', 'brief-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Students can upload files to their own folder: {user_id}/{submission_id}/{filename}
CREATE POLICY "Students upload brief submissions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brief-submissions'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Students can re-upload (upsert) their own files
CREATE POLICY "Students update brief submissions"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brief-submissions'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Authenticated users can read all files in the bucket
CREATE POLICY "Authenticated users read brief submissions"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brief-submissions');

COMMIT;
