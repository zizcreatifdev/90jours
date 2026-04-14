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
