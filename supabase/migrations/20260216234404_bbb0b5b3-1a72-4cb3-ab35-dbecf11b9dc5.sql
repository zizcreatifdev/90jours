
-- Add soft delete support to payments
ALTER TABLE public.payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
