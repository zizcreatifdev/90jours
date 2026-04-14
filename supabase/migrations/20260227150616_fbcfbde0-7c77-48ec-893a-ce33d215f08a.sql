
-- Table messages formateur <-> étudiant (annonces + réponses)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  recipient_id UUID, -- NULL = toute la cohorte
  parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE, -- réponse
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Staff/admin can insert messages
CREATE POLICY "Staff can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR
  (parent_id IS NOT NULL AND auth.uid() = sender_id)
);

-- Students can reply (insert with parent_id)
CREATE POLICY "Students can reply to messages"
ON public.messages FOR INSERT
WITH CHECK (
  parent_id IS NOT NULL AND auth.uid() = sender_id
);

-- View: staff sees all, students see messages for their cohort or addressed to them
CREATE POLICY "Staff can view all messages"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Students can view own messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = recipient_id
  OR auth.uid() = sender_id
  OR (recipient_id IS NULL AND EXISTS (
    SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND cohort_id = messages.cohort_id
  ))
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- Auto-notification triggers
-- ============================================

-- Function to create notifications for all students in a cohort
CREATE OR REPLACE FUNCTION public.notify_cohort_students()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  notif_type TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Determine notification content based on table
  IF TG_TABLE_NAME = 'briefs' THEN
    notif_type := 'brief';
    notif_title := '📝 Nouveau brief : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Un nouveau brief a été ajouté.');
  ELSIF TG_TABLE_NAME = 'masterclass_sessions' THEN
    notif_type := 'info';
    notif_title := '🎓 Nouvelle masterclass : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Une séance de masterclass a été planifiée.');
  ELSIF TG_TABLE_NAME = 'research_sessions' THEN
    notif_type := 'info';
    notif_title := '🔍 Nouvelle séance de recherche : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Une séance de recherche a été planifiée.');
  END IF;

  -- Insert notification for each enrolled student
  FOR student_record IN
    SELECT e.user_id FROM enrollments e
    WHERE e.cohort_id = NEW.cohort_id
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = e.user_id AND ur.role IN ('super_admin', 'staff')
      )
  LOOP
    INSERT INTO notifications (user_id, cohort_id, type, title, message, created_by)
    VALUES (student_record.user_id, NEW.cohort_id, notif_type, notif_title, notif_message, 
            CASE WHEN TG_TABLE_NAME = 'briefs' THEN NEW.created_by ELSE NEW.created_by END);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on briefs
CREATE TRIGGER notify_new_brief
AFTER INSERT ON public.briefs
FOR EACH ROW
EXECUTE FUNCTION public.notify_cohort_students();

-- Trigger on masterclass_sessions
CREATE TRIGGER notify_new_masterclass
AFTER INSERT ON public.masterclass_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_cohort_students();

-- Trigger on research_sessions
CREATE TRIGGER notify_new_research
AFTER INSERT ON public.research_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_cohort_students();
