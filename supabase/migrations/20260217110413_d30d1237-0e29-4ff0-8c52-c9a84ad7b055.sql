
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Students can view their own notifications
CREATE POLICY "Students can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Students can update their own notifications (mark as read)
CREATE POLICY "Students can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Staff can insert notifications
CREATE POLICY "Staff can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Staff can view notifications they created
CREATE POLICY "Staff can view notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
