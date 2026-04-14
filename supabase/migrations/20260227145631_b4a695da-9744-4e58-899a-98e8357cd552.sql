CREATE POLICY "Students can update own submissions"
ON public.brief_submissions
FOR UPDATE
USING (auth.uid() = user_id);