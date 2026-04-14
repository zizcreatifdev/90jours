
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
