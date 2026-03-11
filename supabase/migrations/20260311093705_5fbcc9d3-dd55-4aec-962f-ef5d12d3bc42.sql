
-- Create payment_logs table
CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date,
  payment_mode text,
  entered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment_logs" ON public.payment_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert payment_logs" ON public.payment_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Add finance columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS approval_for_production text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS approval_for_dispatch text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS finance_remarks text;
