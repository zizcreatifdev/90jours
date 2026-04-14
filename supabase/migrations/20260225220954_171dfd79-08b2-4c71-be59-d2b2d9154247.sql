
ALTER TABLE public.cohorts
  DROP CONSTRAINT cohorts_formation_id_fkey;

ALTER TABLE public.cohorts
  ADD CONSTRAINT cohorts_formation_id_fkey
  FOREIGN KEY (formation_id) REFERENCES public.formations(id) ON DELETE SET NULL;
