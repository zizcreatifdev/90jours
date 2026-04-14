
CREATE OR REPLACE FUNCTION public.get_cohort_enrollment_count(cohort_uuid uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.enrollments e
  WHERE e.cohort_id = cohort_uuid
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = e.user_id 
        AND ur.role IN ('super_admin', 'staff')
    )
$$;
