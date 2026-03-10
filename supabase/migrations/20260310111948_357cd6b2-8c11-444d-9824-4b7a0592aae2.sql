
ALTER TABLE public.orders
  ADD COLUMN finance_status TEXT NOT NULL DEFAULT 'Pending Approval',
  ADD COLUMN survey_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN design_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN dispatch_status TEXT NOT NULL DEFAULT 'Not Dispatched',
  ADD COLUMN installation_status TEXT NOT NULL DEFAULT 'Pending';
