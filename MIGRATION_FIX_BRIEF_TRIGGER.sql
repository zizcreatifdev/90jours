-- A executer manuellement en production via le dashboard Supabase SQL Editor.
-- Contenu identique a supabase/migrations/20260701130000_fix_brief_trigger_rls.sql

-- Fix 1 : notify_cohort_students - ne notifie pas les etudiants pour les briefs
-- dont publish_at est dans le futur (brief programme).
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
  IF TG_TABLE_NAME = 'briefs' AND NEW.publish_at > now() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'briefs' THEN
    notif_type := 'brief';
    notif_title := 'Nouveau brief : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Un nouveau brief a ete ajoute.');
  ELSIF TG_TABLE_NAME = 'masterclass_sessions' THEN
    notif_type := 'info';
    notif_title := 'Nouvelle masterclass : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Une seance de masterclass a ete planifiee.');
  ELSIF TG_TABLE_NAME = 'research_sessions' THEN
    notif_type := 'info';
    notif_title := 'Nouvelle seance de recherche : ' || NEW.title;
    notif_message := COALESCE(LEFT(NEW.description, 200), 'Une seance de recherche a ete planifiee.');
  END IF;

  FOR student_record IN
    SELECT e.user_id FROM enrollments e
    WHERE e.cohort_id = NEW.cohort_id
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = e.user_id
          AND ur.role IN ('super_admin', 'staff')
      )
  LOOP
    INSERT INTO notifications (user_id, cohort_id, type, title, message, created_by)
    VALUES (
      student_record.user_id,
      NEW.cohort_id,
      notif_type,
      notif_title,
      notif_message,
      NEW.created_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Fix 2 : RLS policy
DROP POLICY IF EXISTS "Enrolled students can view briefs" ON public.briefs;
CREATE POLICY "Enrolled students can view briefs"
  ON public.briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE user_id = auth.uid()
        AND cohort_id = briefs.cohort_id
    )
    AND publish_at <= now()
  );
