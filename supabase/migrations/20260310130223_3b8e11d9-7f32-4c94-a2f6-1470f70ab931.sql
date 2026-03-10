
-- Add new columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'Retail';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'Windows';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS other_product_type text;

-- Add unique constraint on sales_order_no (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS orders_sales_order_no_unique ON public.orders (sales_order_no) WHERE sales_order_no IS NOT NULL AND sales_order_no != '';

-- Create project_names settings table
CREATE TABLE IF NOT EXISTS public.project_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view project_names" ON public.project_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert project_names" ON public.project_names FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update project_names" ON public.project_names FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete project_names" ON public.project_names FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create project_client_names settings table
CREATE TABLE IF NOT EXISTS public.project_client_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_client_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view project_client_names" ON public.project_client_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert project_client_names" ON public.project_client_names FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update project_client_names" ON public.project_client_names FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete project_client_names" ON public.project_client_names FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create other_product_types settings table
CREATE TABLE IF NOT EXISTS public.other_product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.other_product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view other_product_types" ON public.other_product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert other_product_types" ON public.other_product_types FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update other_product_types" ON public.other_product_types FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete other_product_types" ON public.other_product_types FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
