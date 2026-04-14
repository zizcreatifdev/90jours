
-- Table to track seen announcements per user
CREATE TABLE public.seen_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.seen_announcements ENABLE ROW LEVEL SECURITY;

-- Users can view their own seen announcements
CREATE POLICY "Users can view own seen announcements"
ON public.seen_announcements FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own seen announcements
CREATE POLICY "Users can insert own seen announcements"
ON public.seen_announcements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage seen announcements"
ON public.seen_announcements FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));
