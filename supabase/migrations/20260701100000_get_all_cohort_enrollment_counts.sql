-- Retourne le nombre d'etudiants inscrits par cohorte, en excluant les staff/admin.
-- SECURITY DEFINER : contourne le RLS sur enrollments (la table n'est pas lisible publiquement).
-- Utilise par use-cohorts.ts pour afficher les places restantes sur la page publique.
CREATE OR REPLACE FUNCTION public.get_all_cohort_enrollment_counts()
RETURNS TABLE(cohort_id uuid, enrollment_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.cohort_id,
    COUNT(*)::integer AS enrollment_count
  FROM enrollments e
  WHERE e.user_id NOT IN (
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role IN ('super_admin', 'staff')
  )
  GROUP BY e.cohort_id
$$;

GRANT EXECUTE ON FUNCTION public.get_all_cohort_enrollment_counts() TO anon, authenticated;
