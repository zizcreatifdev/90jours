
-- Function to recalculate enrollment progress based on delivered briefs
CREATE OR REPLACE FUNCTION public.recalculate_enrollment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cohort_id uuid;
  v_user_id uuid;
  v_total_briefs integer;
  v_delivered integer;
  v_progress integer;
BEGIN
  -- Determine user_id and brief_id from the trigger row
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    SELECT cohort_id INTO v_cohort_id FROM briefs WHERE id = OLD.brief_id;
  ELSE
    v_user_id := NEW.user_id;
    SELECT cohort_id INTO v_cohort_id FROM briefs WHERE id = NEW.brief_id;
  END IF;

  IF v_cohort_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total briefs in that cohort
  SELECT COUNT(*) INTO v_total_briefs
  FROM briefs
  WHERE cohort_id = v_cohort_id;

  -- Count delivered submissions for this user in this cohort
  SELECT COUNT(*) INTO v_delivered
  FROM brief_submissions bs
  JOIN briefs b ON b.id = bs.brief_id
  WHERE bs.user_id = v_user_id
    AND b.cohort_id = v_cohort_id
    AND bs.status = 'completed';

  -- Calculate progress
  IF v_total_briefs = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((v_delivered::numeric / v_total_briefs::numeric) * 100);
  END IF;

  -- Update enrollment
  UPDATE enrollments
  SET progress = v_progress
  WHERE user_id = v_user_id AND cohort_id = v_cohort_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on brief_submissions changes
CREATE TRIGGER trg_recalc_progress_on_submission
AFTER INSERT OR UPDATE OR DELETE ON public.brief_submissions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_enrollment_progress();

-- Also recalculate when a brief is added/removed from a cohort (affects total count)
CREATE OR REPLACE FUNCTION public.recalculate_cohort_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cohort_id uuid;
  v_total_briefs integer;
  v_enrollment RECORD;
  v_delivered integer;
  v_progress integer;
BEGIN
  v_cohort_id := COALESCE(NEW.cohort_id, OLD.cohort_id);

  SELECT COUNT(*) INTO v_total_briefs
  FROM briefs
  WHERE cohort_id = v_cohort_id;

  FOR v_enrollment IN
    SELECT user_id FROM enrollments WHERE cohort_id = v_cohort_id
  LOOP
    SELECT COUNT(*) INTO v_delivered
    FROM brief_submissions bs
    JOIN briefs b ON b.id = bs.brief_id
    WHERE bs.user_id = v_enrollment.user_id
      AND b.cohort_id = v_cohort_id
      AND bs.status = 'completed';

    IF v_total_briefs = 0 THEN
      v_progress := 0;
    ELSE
      v_progress := ROUND((v_delivered::numeric / v_total_briefs::numeric) * 100);
    END IF;

    UPDATE enrollments
    SET progress = v_progress
    WHERE user_id = v_enrollment.user_id AND cohort_id = v_cohort_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_progress_on_brief_change
AFTER INSERT OR DELETE ON public.briefs
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_cohort_progress();
