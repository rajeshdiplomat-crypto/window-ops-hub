
-- Add Store fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hardware_availability text NOT NULL DEFAULT 'No';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extrusion_availability text NOT NULL DEFAULT 'No';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS glass_availability text NOT NULL DEFAULT 'No';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coated_extrusion_availability text NOT NULL DEFAULT 'No';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_remarks text;

-- Add Procurement fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hardware_po_status text NOT NULL DEFAULT 'Not Required';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extrusion_po_status text NOT NULL DEFAULT 'Not Required';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS glass_po_status text NOT NULL DEFAULT 'Not Required';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coating_status text NOT NULL DEFAULT 'Not Required';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS procurement_remarks text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hardware_delivery_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extrusion_delivery_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS glass_delivery_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coating_delivery_date date;
