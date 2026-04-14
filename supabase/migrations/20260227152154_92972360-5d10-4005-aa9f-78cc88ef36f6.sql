
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
