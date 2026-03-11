
-- Add new columns to payment_logs
ALTER TABLE public.payment_logs
  ADD COLUMN IF NOT EXISTS source_module text NOT NULL DEFAULT 'Finance',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Confirmed',
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Allow authenticated users to update and delete payment_logs (for draft management)
CREATE POLICY "Authenticated can update payment_logs"
  ON public.payment_logs FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete payment_logs"
  ON public.payment_logs FOR DELETE TO authenticated
  USING (true);
