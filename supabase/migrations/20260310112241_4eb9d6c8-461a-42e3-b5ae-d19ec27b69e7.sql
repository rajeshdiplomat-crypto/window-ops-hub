
-- Drop old boolean columns and add numeric ones
ALTER TABLE public.production_status
  DROP COLUMN cutting_completed,
  DROP COLUMN assembly_completed,
  DROP COLUMN glazing_completed,
  DROP COLUMN qc_completed,
  DROP COLUMN packing_completed,
  ADD COLUMN cutting INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN assembly INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN glazing INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN qc INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN packing INTEGER NOT NULL DEFAULT 0;

-- Create production_units config table
CREATE TABLE public.production_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_units" ON public.production_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage production_units" ON public.production_units FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update production_units" ON public.production_units FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete production_units" ON public.production_units FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default units
INSERT INTO public.production_units (name) VALUES ('Unit-1'), ('Unit-2');
