
-- Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'staff', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Cohorts table
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cohorts" ON public.cohorts FOR SELECT USING (true);
CREATE POLICY "Admins can manage cohorts" ON public.cohorts FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Staff can view enrollments for assigned cohorts" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Anyone can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'link')),
  url TEXT NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view resources" ON public.resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND cohort_id = resources.cohort_id)
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Staff and admins can manage resources" ON public.resources FOR ALL USING (
  public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'super_admin')
);

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view announcements" ON public.announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND cohort_id = announcements.cohort_id)
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Staff and admins can manage announcements" ON public.announcements FOR ALL USING (
  public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'super_admin')
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrollment count function (for real-time spots checking)
CREATE OR REPLACE FUNCTION public.get_cohort_enrollment_count(cohort_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.enrollments WHERE cohort_id = cohort_uuid
$$;

-- Enable realtime for enrollments (for live seat count)
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;

-- Seed initial cohorts
INSERT INTO public.cohorts (name, description, start_date, end_date, status) VALUES
  ('Creative', 'Maîtrisez les fondamentaux du design graphique : typographie, composition et couleur.', '2026-01-05', '2026-03-27', 'active'),
  ('Genius', 'Perfectionnez vos compétences en identité visuelle, branding et direction artistique.', '2026-05-04', '2026-07-24', 'upcoming'),
  ('Visionnaire', 'Explorez le design digital, le motion design et les tendances créatives de demain.', '2026-09-07', '2026-11-27', 'upcoming');
