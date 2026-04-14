
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
