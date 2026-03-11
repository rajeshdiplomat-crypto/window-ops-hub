
-- Add rework columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rework_qty integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rework_issue text;

-- Create commercial_statuses settings table
CREATE TABLE IF NOT EXISTS public.commercial_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view commercial_statuses" ON public.commercial_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert commercial_statuses" ON public.commercial_statuses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update commercial_statuses" ON public.commercial_statuses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete commercial_statuses" ON public.commercial_statuses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default commercial statuses
INSERT INTO public.commercial_statuses (name) VALUES ('Pipeline'), ('Confirmed'), ('Hold'), ('Cancelled');
