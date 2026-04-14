-- ════════════════════════════════════════
-- 20260216214848_ad19174e-6fc8-4bc7-afb8-cb8705a9a21e.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260216220605_ada77ef9-7507-4c73-a336-72baa81e85f8.sql
-- ════════════════════════════════════════
-- Add motivation field to enrollments
ALTER TABLE public.enrollments ADD COLUMN motivation TEXT;

-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Storage policies for resources bucket
CREATE POLICY "Anyone can view resources" ON storage.objects FOR SELECT USING (bucket_id = 'resources');

CREATE POLICY "Staff and admins can upload resources" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'resources' AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Staff and admins can delete resources" ON storage.objects FOR DELETE 
USING (bucket_id = 'resources' AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'super_admin')));

-- Allow admins to view all profiles (for user management)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- Allow staff to view enrolled student profiles
CREATE POLICY "Staff can view student profiles" ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'staff') AND EXISTS (
  SELECT 1 FROM enrollments e WHERE e.user_id = profiles.user_id
));

-- Allow admins to view all roles
-- (already exists: "Admins can manage all roles" with ALL command)

-- ════════════════════════════════════════
-- 20260216223227_262aa692-d3d4-4fbe-b3d2-ded088280327.sql
-- ════════════════════════════════════════

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id),
  amount integer NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('inscription', 'formation')),
  payment_method text NOT NULL CHECK (payment_method IN ('wave', 'orange_money', 'especes', 'autre')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  reference text,
  notes text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Staff can view payments
CREATE POLICY "Staff can view payments"
  ON public.payments FOR SELECT
  USING (has_role(auth.uid(), 'staff'));

-- Students can view their own payments
CREATE POLICY "Students can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════
-- 20260216231535_ca3350f0-a340-4682-b1b7-6d097a8ec7e3.sql
-- ════════════════════════════════════════

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow anyone to view avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ════════════════════════════════════════
-- 20260216233559_58ab1e49-f449-4504-8817-285b98aaeb8d.sql
-- ════════════════════════════════════════

-- Create site_settings table for admin-configurable settings like hero image
CREATE TABLE public.site_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  hero_image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can update site settings"
  ON public.site_settings FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.site_settings (id) VALUES ('default');

-- Create hero-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true);

CREATE POLICY "Anyone can view hero images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Super admins can upload hero images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update hero images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete hero images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hero-images' AND has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════
-- 20260216234404_bbb0b5b3-1a72-4cb3-ab35-dbecf11b9dc5.sql
-- ════════════════════════════════════════

-- Add soft delete support to payments
ALTER TABLE public.payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ════════════════════════════════════════
-- 20260216235558_e9d73ba3-cee6-4900-b26c-5ae52195c64b.sql
-- ════════════════════════════════════════

-- Table des codes promo
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  is_early_bird BOOLEAN NOT NULL DEFAULT false,
  early_bird_deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active = true);

-- Track which user used which promo code
CREATE TABLE public.promo_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo usage"
ON public.promo_code_usage FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view own usage"
ON public.promo_code_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
ON public.promo_code_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════
-- 20260217100514_d2e3ec3e-192b-4c29-ad6f-f634d1927486.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260217101453_e4f9e5e2-7a49-40d3-aa2c-07153848768d.sql
-- ════════════════════════════════════════
ALTER TABLE public.briefs ADD COLUMN publish_at timestamp with time zone NOT NULL DEFAULT now();
-- ════════════════════════════════════════
-- 20260217102203_40e739ec-debe-45e0-8ca5-7383cd7b12ef.sql
-- ════════════════════════════════════════

-- Create brief_categories table
CREATE TABLE public.brief_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brief_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.brief_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.brief_categories FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default categories
INSERT INTO public.brief_categories (name) VALUES
  ('Création de logo'),
  ('Création d''affiche'),
  ('Création d''étiquette'),
  ('Création de bannière');

-- Add category_id to briefs
ALTER TABLE public.briefs ADD COLUMN category_id uuid REFERENCES public.brief_categories(id);

-- Add brief_frequency to briefs (daily, weekly, or null for normal)
ALTER TABLE public.briefs ADD COLUMN brief_frequency text;

-- Add cohort_type to cohorts (standard, initiation)
ALTER TABLE public.cohorts ADD COLUMN cohort_type text NOT NULL DEFAULT 'standard';

-- ════════════════════════════════════════
-- 20260217110413_d30d1237-0e29-4ff0-8c52-c9a84ad7b055.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260217110743_a78c3e71-5c8a-40a7-94b9-1aac51f16ee6.sql
-- ════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ════════════════════════════════════════
-- 20260217130829_565e5c2a-5de1-444f-85e1-c7c3bafd65a9.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260217145545_e35fb915-0310-4db0-8268-52f8ceb5f2ce.sql
-- ════════════════════════════════════════

-- Create formations table
CREATE TABLE public.formations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  deliverable_label TEXT NOT NULL DEFAULT 'Portfolio',
  deliverable_description TEXT,
  attestation_title TEXT,
  attestation_body TEXT,
  attestation_logo_url TEXT,
  attestation_color TEXT DEFAULT '#1a1a2e',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active formations
CREATE POLICY "Anyone can view active formations"
ON public.formations FOR SELECT
USING (is_active = true);

-- Admins can manage all formations
CREATE POLICY "Admins can manage formations"
ON public.formations FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add formation_id to cohorts
ALTER TABLE public.cohorts ADD COLUMN formation_id UUID REFERENCES public.formations(id);

-- Add formation_id to portfolios for clarity
ALTER TABLE public.portfolios ADD COLUMN formation_id UUID REFERENCES public.formations(id);

-- Trigger for updated_at
CREATE TRIGGER update_formations_updated_at
BEFORE UPDATE ON public.formations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with initial formation
INSERT INTO public.formations (name, slug, description, deliverable_label, deliverable_description, attestation_title, attestation_body, attestation_color)
VALUES (
  '90 jours en graphisme',
  'graphisme',
  'La formation intensive qui transforme votre créativité en 90 jours.',
  'Portfolio',
  'Soumettez le lien de votre portfolio de fin de formation.',
  'Attestation de formation en Graphisme',
  'Nous certifions que {student_name} a suivi avec succès la formation "90 jours en graphisme" et a validé l''ensemble des livrables requis.',
  '#1a1a2e'
);

-- ════════════════════════════════════════
-- 20260217150315_62fb3df1-ad41-475d-b77a-f211246fbbe3.sql
-- ════════════════════════════════════════
ALTER TABLE public.formations ADD COLUMN level TEXT NOT NULL DEFAULT 'debutant';
-- ════════════════════════════════════════
-- 20260217161525_1af3b0c0-39ad-434d-ac40-ab5578fc1237.sql
-- ════════════════════════════════════════

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'Formez-vous en 90 jours',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_email TEXT DEFAULT 'info@90jours.com',
  ADD COLUMN IF NOT EXISTS footer_phone TEXT DEFAULT '+225 07 00 00 00 00',
  ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT 'Des formations intensives qui transforment votre créativité en 90 jours.';

-- ════════════════════════════════════════
-- 20260218013948_e39b4919-bf75-4add-bc3e-dd963ebe4552.sql
-- ════════════════════════════════════════
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'Des formations intensives qui transforment votre créativité en 90 jours.';
-- ════════════════════════════════════════
-- 20260218022829_5610ae5a-3370-41b1-aa0f-6e8016a48cbe.sql
-- ════════════════════════════════════════

-- Table for hero carousel slides
CREATE TABLE public.hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hero slides"
  ON public.hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage hero slides"
  ON public.hero_slides FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ════════════════════════════════════════
-- 20260218025854_e6827760-e82c-4b3d-968a-7577c39eabcf.sql
-- ════════════════════════════════════════

-- Table linking staff members to formations
CREATE TABLE public.staff_formations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, formation_id)
);

-- Enable RLS
ALTER TABLE public.staff_formations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage staff formations"
  ON public.staff_formations
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Staff can view their own assignments
CREATE POLICY "Staff can view own assignments"
  ON public.staff_formations
  FOR SELECT
  USING (auth.uid() = user_id);

-- ════════════════════════════════════════
-- 20260218124604_48aed581-c842-43f7-98cc-1b96d6ccac79.sql
-- ════════════════════════════════════════

-- Create audit log table for staff actions
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view and insert audit logs
CREATE POLICY "Super admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target_user ON public.audit_logs(target_user_id);

-- ════════════════════════════════════════
-- 20260218143740_9930b7e1-8b4e-4a25-9ea5-8a8ebb8ef0bf.sql
-- ════════════════════════════════════════

-- Table des tâches staff
CREATE TABLE public.staff_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des commentaires
CREATE TABLE public.staff_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.staff_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_task_comments ENABLE ROW LEVEL SECURITY;

-- Policies pour staff_tasks
CREATE POLICY "Admins can manage all tasks" ON public.staff_tasks
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can view assigned tasks" ON public.staff_tasks
  FOR SELECT USING (auth.uid() = assigned_to);

CREATE POLICY "Staff can update assigned tasks" ON public.staff_tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Policies pour staff_task_comments
CREATE POLICY "Admins can manage all comments" ON public.staff_task_comments
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Staff can view comments on assigned tasks" ON public.staff_task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.staff_tasks WHERE id = staff_task_comments.task_id AND assigned_to = auth.uid())
  );

CREATE POLICY "Staff can add comments on assigned tasks" ON public.staff_task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.staff_tasks WHERE id = staff_task_comments.task_id AND assigned_to = auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER update_staff_tasks_updated_at
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_tasks;

-- ════════════════════════════════════════
-- 20260218152939_288f3dc0-91ac-4175-9989-4c8318a9e2d6.sql
-- ════════════════════════════════════════

-- 1. Update handle_new_user to NOT add student role automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$;

-- 2. Create trigger to add student role on enrollment (if not already present)
CREATE OR REPLACE FUNCTION public.handle_new_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add student role only if user doesn't already have it
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_enrollment_created
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_enrollment();

-- ════════════════════════════════════════
-- 20260225220542_a5eb9267-f6de-4ad8-becf-f9749e0c7787.sql
-- ════════════════════════════════════════

ALTER TABLE public.formations
ADD COLUMN registration_fee integer NOT NULL DEFAULT 10000,
ADD COLUMN total_price integer NOT NULL DEFAULT 50000;

-- ════════════════════════════════════════
-- 20260225220954_171dfd79-08b2-4c71-be59-d2b2d9154247.sql
-- ════════════════════════════════════════

ALTER TABLE public.cohorts
  DROP CONSTRAINT cohorts_formation_id_fkey;

ALTER TABLE public.cohorts
  ADD CONSTRAINT cohorts_formation_id_fkey
  FOREIGN KEY (formation_id) REFERENCES public.formations(id) ON DELETE SET NULL;

-- ════════════════════════════════════════
-- 20260225221835_ffe9c0a2-7056-4a96-a17e-c16b8c06fde7.sql
-- ════════════════════════════════════════

-- Add signature and stamp image URLs to formations
ALTER TABLE public.formations
ADD COLUMN attestation_signature_url text,
ADD COLUMN attestation_stamp_url text;

-- Create attestations table to track issued certificates
CREATE TABLE public.attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL,
  certificate_number text NOT NULL DEFAULT ('ATT-' || substr(gen_random_uuid()::text, 1, 8))
);

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all attestations
CREATE POLICY "Admins can manage attestations"
ON public.attestations FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Staff can view attestations
CREATE POLICY "Staff can view attestations"
ON public.attestations FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Students can view their own attestations
CREATE POLICY "Students can view own attestations"
ON public.attestations FOR SELECT
USING (auth.uid() = user_id);

-- Unique constraint: one attestation per student per cohort
ALTER TABLE public.attestations ADD CONSTRAINT unique_user_cohort_attestation UNIQUE (user_id, cohort_id);

-- ════════════════════════════════════════
-- 20260226230941_37eb35f9-b1e1-4660-8823-727c9b6c16ec.sql
-- ════════════════════════════════════════

-- Add JSONB template column to formations for drag & drop layout
ALTER TABLE public.formations ADD COLUMN IF NOT EXISTS attestation_template jsonb DEFAULT NULL;

-- Add status and blocking_reason to attestations for tracking
ALTER TABLE public.attestations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issued';
ALTER TABLE public.attestations ADD COLUMN IF NOT EXISTS blocking_reason text DEFAULT NULL;

-- Create attestation_actions table for history tracking
CREATE TABLE public.attestation_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attestation_id uuid REFERENCES public.attestations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text DEFAULT NULL,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attestation_actions ENABLE ROW LEVEL SECURITY;

-- Policies for attestation_actions
CREATE POLICY "Admins can manage attestation actions"
  ON public.attestation_actions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can view attestation actions"
  ON public.attestation_actions FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Students can view own attestation actions"
  ON public.attestation_actions FOR SELECT
  USING (auth.uid() = user_id);

-- ════════════════════════════════════════
-- 20260227142354_33db1311-8e54-4a16-a6aa-b32e22235d94.sql
-- ════════════════════════════════════════

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ════════════════════════════════════════
-- 20260227143425_b875bda6-9e24-432d-a067-66bd47e6eef9.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260227144428_e084f9a1-e033-4adc-8029-fa8fc47592b6.sql
-- ════════════════════════════════════════

-- Add status column to brief_submissions to differentiate completed vs delivered
ALTER TABLE public.brief_submissions
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

-- completed = réalisé (fait mais pas encore envoyé)
-- delivered = livré (envoyé au formateur)

-- ════════════════════════════════════════
-- 20260227145631_b4a695da-9744-4e58-899a-98e8357cd552.sql
-- ════════════════════════════════════════
CREATE POLICY "Students can update own submissions"
ON public.brief_submissions
FOR UPDATE
USING (auth.uid() = user_id);
-- ════════════════════════════════════════
-- 20260227150616_fbcfbde0-7c77-48ec-893a-ce33d215f08a.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260227152154_92972360-5d10-4005-aa9f-78cc88ef36f6.sql
-- ════════════════════════════════════════

-- Table for expenses (outgoing money)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('formateur', 'mentor', 'technique', 'autre')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for staff payments (formateurs & mentors)
CREATE TABLE public.staff_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('formateur', 'mentor')),
  amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage staff payments" ON public.staff_payments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_staff_payments_updated_at BEFORE UPDATE ON public.staff_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════
-- 20260227155546_6969c60d-e9ff-456e-a0f5-76fa9ecfa2b4.sql
-- ════════════════════════════════════════
-- Allow students to declare payments (inserted as pending)
CREATE POLICY "Students can declare own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- ════════════════════════════════════════
-- 20260227170652_b9fc8198-2f01-4c75-bd9d-00062688b84f.sql
-- ════════════════════════════════════════

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Admins/staff can read all (for sending notifications)
CREATE POLICY "Service role can read all push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Create unique constraint on user_id + endpoint to avoid duplicates
CREATE UNIQUE INDEX idx_push_subscriptions_user_endpoint 
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- ════════════════════════════════════════
-- 20260227210351_a8752b06-7f00-4194-9307-29dba0c65383.sql
-- ════════════════════════════════════════
ALTER TABLE public.formations ADD COLUMN duration_days integer NOT NULL DEFAULT 90;
-- ════════════════════════════════════════
-- 20260228104431_bf904db9-8520-44f9-a487-19e2aa1239da.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260228111616_e4514d0a-ef6d-4264-843b-91e829b4df91.sql
-- ════════════════════════════════════════

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

-- ════════════════════════════════════════
-- 20260414130000_add_feedback_to_brief_submissions.sql
-- ════════════════════════════════════════
-- Migration: add formateur feedback column to brief_submissions
-- Allows staff to leave inline feedback on each student's submission.
-- The student sees it directly in their briefs panel (StudentBriefs.tsx).

ALTER TABLE public.brief_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT;

-- ════════════════════════════════════════
-- 20260414140000_create_student_badges.sql
-- ════════════════════════════════════════
-- Migration: student_badges table (NH-01)
-- Stores achievements/badges earned by students.
-- badge_type is constrained to known values by the application.
-- UNIQUE(user_id, badge_type) prevents duplicate badge awards.

CREATE TABLE IF NOT EXISTS public.student_badges (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT        NOT NULL,
  earned_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata   JSONB       DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_type)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Students can view their own badges
CREATE POLICY "student_badges_select_own"
  ON public.student_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Students can award themselves badges (logic enforced in the hook)
CREATE POLICY "student_badges_insert_own"
  ON public.student_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view any badge (for future reporting)
CREATE POLICY "student_badges_select_admin"
  ON public.student_badges FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ── Index for fast lookups by user ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS student_badges_user_id_idx ON public.student_badges (user_id);

-- ════════════════════════════════════════
-- 20260414150000_create_contract_tables.sql
-- ════════════════════════════════════════
-- Migration: contract_templates + student_contracts (Prompt-23)
-- Enables digital contract signing for student enrollment.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  content      TEXT        NOT NULL,  -- HTML with {{variable}} placeholders
  formation_id UUID        REFERENCES public.formations(id) ON DELETE SET NULL,
  is_active    BOOLEAN     DEFAULT true NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_contracts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id         UUID        NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  template_id       UUID        REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  signed_at         TIMESTAMPTZ,
  signature_name    TEXT,
  ip_address        TEXT,
  contract_snapshot TEXT,        -- frozen HTML at time of signature
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, cohort_id)
);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS — contract_templates ──────────────────────────────────────────────────

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_templates_select_auth"
  ON public.contract_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "contract_templates_admin_all"
  ON public.contract_templates FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ── RLS — student_contracts ───────────────────────────────────────────────────

ALTER TABLE public.student_contracts ENABLE ROW LEVEL SECURITY;

-- Students see & manage their own contracts
CREATE POLICY "student_contracts_own"
  ON public.student_contracts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "student_contracts_admin_select"
  ON public.student_contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Staff see all (read-only)
CREATE POLICY "student_contracts_staff_select"
  ON public.student_contracts FOR SELECT
  USING (public.has_role(auth.uid(), 'staff'));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS student_contracts_user_id_idx ON public.student_contracts (user_id);
CREATE INDEX IF NOT EXISTS student_contracts_cohort_id_idx ON public.student_contracts (cohort_id);

-- ── Default template ──────────────────────────────────────────────────────────

INSERT INTO public.contract_templates (name, content, is_active) VALUES (
  'Contrat standard 90 jours',
  $TEMPLATE$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;line-height:1.7;margin:0;padding:0;background:#fff}
    .container{max-width:800px;margin:0 auto;padding:40px}
    .header{text-align:center;margin-bottom:40px;border-bottom:3px solid #2563eb;padding-bottom:30px}
    .logo{font-size:32px;font-weight:900;color:#2563eb;letter-spacing:-1px;margin-bottom:8px}
    .doc-title{font-size:22px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:2px}
    .doc-sub{font-size:13px;color:#6b7280;margin-top:6px}
    .section{margin:32px 0}
    .section-title{font-size:15px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:1px;border-left:4px solid #2563eb;padding-left:12px;margin-bottom:16px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;border-radius:8px;padding:20px}
    .info-item label{font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;display:block}
    .info-item span{font-size:15px;font-weight:600;color:#1a1a2e}
    ul.c{list-style:none;padding:0;margin:0}
    ul.c li{padding:10px 12px 10px 36px;position:relative;border-bottom:1px solid #f1f5f9}
    ul.c li:last-child{border-bottom:none}
    ul.c li::before{content:"✓";position:absolute;left:12px;color:#10b981;font-weight:700}
    .fin-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px}
    .amount{font-size:28px;font-weight:800;color:#2563eb}
    .warn{background:#fff7ed;border-left:4px solid #f97316;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:14px;color:#9a3412}
    .sig-section{margin-top:48px;border-top:2px solid #e5e7eb;padding-top:32px}
    .sig-line{border-bottom:1px solid #374151;width:300px;margin:40px 0 8px}
    .sig-label{font-size:12px;color:#6b7280}
    .footer-note{font-size:11px;color:#9ca3af;text-align:center;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">90 JOURS</div>
    <div class="doc-title">Contrat de Formation</div>
    <div class="doc-sub">Document contractuel officiel — à conserver</div>
  </div>

  <div class="section">
    <div class="section-title">Identification des parties</div>
    <div class="info-grid">
      <div class="info-item"><label>Prénom</label><span>{{prenom}}</span></div>
      <div class="info-item"><label>Nom</label><span>{{nom}}</span></div>
      <div class="info-item"><label>Email</label><span>{{email}}</span></div>
      <div class="info-item"><label>Formation</label><span>{{formation}}</span></div>
      <div class="info-item"><label>Cohorte</label><span>Cohorte {{cohorte}}</span></div>
      <div class="info-item"><label>Formateur référent</label><span>{{formateur}}</span></div>
      <div class="info-item"><label>Date de début</label><span>{{date_debut}}</span></div>
      <div class="info-item"><label>Date de fin</label><span>{{date_fin}}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Engagements de l'étudiant(e)</div>
    <ul class="c">
      <li>Soumettre tous les briefs dans les délais impartis, ou informer le formateur en cas d'empêchement</li>
      <li>Rendre le livrable final (portfolio) avant la date de clôture de la cohorte</li>
      <li>Participer activement à toutes les sessions, masterclasses et exercices pratiques</li>
      <li>Respecter les membres de la communauté et contribuer à un environnement d'apprentissage bienveillant</li>
      <li>Consacrer un minimum de 15 heures par semaine à la formation et aux exercices pratiques</li>
      <li>Utiliser les ressources pédagogiques de manière éthique et responsable</li>
      <li>Informer le formateur de toute difficulté rencontrée dans les meilleurs délais</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">Engagements de la formation</div>
    <ul class="c">
      <li>Donner accès à l'intégralité des ressources pédagogiques numériques pour la durée de la formation</li>
      <li>Proposer un suivi personnalisé par un formateur dédié tout au long du parcours</li>
      <li>Remettre une attestation de réussite à l'issue si les critères sont remplis</li>
      <li>Garantir une disponibilité du support durant toute la durée de la cohorte (jours ouvrés)</li>
      <li>Maintenir l'accès à la plateforme pendant 6 mois après la fin de la cohorte</li>
      <li>Animer les sessions de masterclass et sessions de recherche aux dates prévues</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">Conditions financières</div>
    <div class="fin-box">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280">Montant total de la formation</label>
        <div class="amount">{{montant}}</div>
      </div>
      <p style="font-size:14px;color:#1e40af;margin:0">Le paiement peut s'effectuer en une ou plusieurs échéances, selon l'accord convenu lors de l'inscription.</p>
    </div>
    <div class="warn">
      <strong>⚠️ Politique de remboursement :</strong> Aucun remboursement ne sera accordé passé un délai de 7 jours calendaires après la signature du présent contrat, sauf cas de force majeure dûment justifié.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dispositions générales</div>
    <p style="font-size:14px;color:#374151">Le présent contrat constitue l'intégralité de l'accord entre les parties concernant la formation. Toute modification doit faire l'objet d'un avenant écrit cosigné. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.</p>
    <p style="font-size:14px;color:#374151;margin-top:12px">Les données personnelles collectées dans le cadre de ce contrat sont traitées conformément à notre politique de confidentialité, accessible sur notre plateforme.</p>
  </div>

  <div class="sig-section">
    <div class="section-title">Signature numérique</div>
    <p style="font-size:14px;color:#374151">En signant ce contrat, je, <strong>{{prenom}} {{nom}}</strong>, déclare avoir lu et accepté l'intégralité des conditions ci-dessus.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px">
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature — {{signature_name}}</div>
        <div style="font-size:13px;color:#374151;margin-top:8px">Signé numériquement le : <strong>{{date_signature}}</strong></div>
        <div style="font-size:13px;color:#374151">à <strong>{{heure_signature}}</strong></div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Pour 90 Jours Formation</div>
        <div style="font-size:13px;color:#374151;margin-top:8px">Représenté(e) par : <strong>{{formateur}}</strong></div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Document généré automatiquement par la plateforme 90 Jours Formation. Conservez cet exemplaire comme preuve de votre engagement contractuel.
  </div>
</div>
</body>
</html>$TEMPLATE$,
  true
);

-- ════════════════════════════════════════
-- 20260414160000_create_testimonials.sql
-- ════════════════════════════════════════
-- Migration: testimonials table (prompt-24)
-- Stores testimonials displayed on the landing page.
-- Admins manage visibility and display order.
-- Public users can only read visible testimonials.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  photo_url     TEXT,
  is_visible    BOOLEAN     NOT NULL DEFAULT false,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public: read only visible testimonials
CREATE POLICY "testimonials_select_visible"
  ON public.testimonials FOR SELECT
  USING (is_visible = true);

-- Admins: full access
CREATE POLICY "testimonials_admin_all"
  ON public.testimonials FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ── Index ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS testimonials_display_order_idx
  ON public.testimonials (display_order ASC)
  WHERE is_visible = true;

-- ════════════════════════════════════════
-- 20260414170000_add_description_to_contract_templates.sql
-- ════════════════════════════════════════
-- Migration prompt-25 : champ description sur contract_templates
-- Permet à l'admin d'identifier rapidement le type de contrat dans la liste.

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS description TEXT;

