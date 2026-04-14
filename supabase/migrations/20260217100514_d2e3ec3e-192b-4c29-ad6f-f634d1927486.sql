
-- Table des briefs publiés par staff/admin
CREATE TABLE public.briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can manage briefs"
  ON public.briefs FOR ALL
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Enrolled students can view briefs"
  ON public.briefs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND cohort_id = briefs.cohort_id
  ));

CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des soumissions de briefs par les étudiants
CREATE TABLE public.brief_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  delay_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brief_id, user_id)
);

ALTER TABLE public.brief_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own submissions"
  ON public.brief_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own submissions"
  ON public.brief_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff and admins can view all submissions"
  ON public.brief_submissions FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage all submissions"
  ON public.brief_submissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Table des portfolios
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, cohort_id)
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can submit own portfolio"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own pending portfolio"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Students can view own portfolio"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff and admins can view all portfolios"
  ON public.portfolios FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage all portfolios"
  ON public.portfolios FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
