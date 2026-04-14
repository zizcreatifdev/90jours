-- Allow students to declare payments (inserted as pending)
CREATE POLICY "Students can declare own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');
