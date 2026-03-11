
-- Create installation_logs table
CREATE TABLE public.installation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_installed INTEGER NOT NULL DEFAULT 0,
  installation_date DATE,
  site_supervisor TEXT,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view installation_logs" ON public.installation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert installation_logs" ON public.installation_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update installation_logs" ON public.installation_logs FOR UPDATE TO authenticated USING (true);

-- Add new columns to rework_logs
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS issue_type TEXT;
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS responsible_person TEXT;
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE public.rework_logs ADD COLUMN IF NOT EXISTS reported_date DATE DEFAULT CURRENT_DATE;
