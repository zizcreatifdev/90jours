
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
