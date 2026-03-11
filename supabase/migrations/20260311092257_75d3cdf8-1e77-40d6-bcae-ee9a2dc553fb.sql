
-- Create rework_logs table
CREATE TABLE IF NOT EXISTS public.rework_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rework_qty integer NOT NULL DEFAULT 0,
  rework_issue text NOT NULL,
  reported_by uuid REFERENCES auth.users(id),
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone
);

ALTER TABLE public.rework_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rework_logs" ON public.rework_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert rework_logs" ON public.rework_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rework_logs" ON public.rework_logs FOR UPDATE TO authenticated USING (true);

-- Create order_activity_log table
CREATE TABLE IF NOT EXISTS public.order_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  module text NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  updated_by uuid REFERENCES auth.users(id),
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view order_activity_log" ON public.order_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert order_activity_log" ON public.order_activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Add timestamp fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create trigger to auto-update updated_at on orders
CREATE OR REPLACE FUNCTION public.update_orders_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_timestamp();
