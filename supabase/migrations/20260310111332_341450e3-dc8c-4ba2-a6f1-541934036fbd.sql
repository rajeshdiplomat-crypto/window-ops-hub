
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM (
  'sales', 'finance', 'survey', 'design', 'procurement', 
  'stores', 'production', 'quality', 'dispatch', 'installation', 
  'management', 'admin'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_no TEXT,
  sales_order_no TEXT,
  order_name TEXT NOT NULL DEFAULT '',
  dealer_name TEXT NOT NULL DEFAULT '',
  salesperson TEXT,
  colour_shade TEXT,
  total_windows INTEGER NOT NULL DEFAULT 0,
  windows_released INTEGER NOT NULL DEFAULT 0,
  sqft NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commercial_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material_status table
CREATE TABLE public.material_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  aluminium_status TEXT NOT NULL DEFAULT 'pending',
  glass_status TEXT NOT NULL DEFAULT 'pending',
  hardware_status TEXT NOT NULL DEFAULT 'pending',
  aluminium_expected_date DATE,
  glass_expected_date DATE,
  hardware_expected_date DATE,
  coating_vendor TEXT
);

-- Create production_status table
CREATE TABLE public.production_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  unit TEXT,
  cutting_completed BOOLEAN NOT NULL DEFAULT false,
  assembly_completed BOOLEAN NOT NULL DEFAULT false,
  glazing_completed BOOLEAN NOT NULL DEFAULT false,
  qc_completed BOOLEAN NOT NULL DEFAULT false,
  packing_completed BOOLEAN NOT NULL DEFAULT false
);

-- Create dispatch table
CREATE TABLE public.dispatch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  windows_dispatched INTEGER NOT NULL DEFAULT 0,
  dispatch_date DATE,
  transporter TEXT,
  vehicle_details TEXT
);

-- Create installation table
CREATE TABLE public.installation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installation_planned DATE,
  installation_completed DATE,
  installation_status TEXT NOT NULL DEFAULT 'pending'
);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Authenticated users can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);

-- Material status policies
CREATE POLICY "Authenticated can view material_status" ON public.material_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert material_status" ON public.material_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update material_status" ON public.material_status FOR UPDATE TO authenticated USING (true);

-- Production status policies
CREATE POLICY "Authenticated can view production_status" ON public.production_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_status" ON public.production_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_status" ON public.production_status FOR UPDATE TO authenticated USING (true);

-- Dispatch policies
CREATE POLICY "Authenticated can view dispatch" ON public.dispatch FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert dispatch" ON public.dispatch FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update dispatch" ON public.dispatch FOR UPDATE TO authenticated USING (true);

-- Installation policies
CREATE POLICY "Authenticated can view installation" ON public.installation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert installation" ON public.installation FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update installation" ON public.installation FOR UPDATE TO authenticated USING (true);

-- Audit log policies
CREATE POLICY "Authenticated can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
