
-- Create production_logs table
CREATE TABLE public.production_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  windows_completed INTEGER NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dispatch_logs table
CREATE TABLE public.dispatch_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_dispatched INTEGER NOT NULL DEFAULT 0,
  dispatch_date DATE,
  transporter TEXT,
  vehicle_details TEXT,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for production_logs
CREATE POLICY "Authenticated can view production_logs" ON public.production_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_logs" ON public.production_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_logs" ON public.production_logs FOR UPDATE TO authenticated USING (true);

-- RLS policies for dispatch_logs
CREATE POLICY "Authenticated can view dispatch_logs" ON public.dispatch_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert dispatch_logs" ON public.dispatch_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update dispatch_logs" ON public.dispatch_logs FOR UPDATE TO authenticated USING (true);
