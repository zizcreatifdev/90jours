
-- Table for masterclass sessions
CREATE TABLE public.masterclass_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.masterclass_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can manage masterclass sessions"
  ON public.masterclass_sessions FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Enrolled students can view masterclass sessions"
  ON public.masterclass_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM enrollments WHERE enrollments.user_id = auth.uid() AND enrollments.cohort_id = masterclass_sessions.cohort_id
  ));

CREATE TRIGGER update_masterclass_sessions_updated_at
  BEFORE UPDATE ON public.masterclass_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for research sessions
CREATE TABLE public.research_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can manage research sessions"
  ON public.research_sessions FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Enrolled students can view research sessions"
  ON public.research_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM enrollments WHERE enrollments.user_id = auth.uid() AND enrollments.cohort_id = research_sessions.cohort_id
  ));

CREATE TRIGGER update_research_sessions_updated_at
  BEFORE UPDATE ON public.research_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
