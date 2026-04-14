
ALTER TABLE public.formations
ADD COLUMN registration_fee integer NOT NULL DEFAULT 10000,
ADD COLUMN total_price integer NOT NULL DEFAULT 50000;
