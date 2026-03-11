
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS survey_done_windows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS survey_remarks text,
  ADD COLUMN IF NOT EXISTS design_released_windows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_remarks text;
