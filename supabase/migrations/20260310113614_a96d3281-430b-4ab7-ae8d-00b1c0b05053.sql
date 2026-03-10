
-- Notifications table for in-app alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Salespersons config table
CREATE TABLE public.salespersons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.salespersons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view salespersons" ON public.salespersons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert salespersons" ON public.salespersons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salespersons" ON public.salespersons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salespersons" ON public.salespersons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Dealers config table
CREATE TABLE public.dealers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view dealers" ON public.dealers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert dealers" ON public.dealers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update dealers" ON public.dealers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete dealers" ON public.dealers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Colour shades config table
CREATE TABLE public.colour_shades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.colour_shades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view colour_shades" ON public.colour_shades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert colour_shades" ON public.colour_shades FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update colour_shades" ON public.colour_shades FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete colour_shades" ON public.colour_shades FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- App settings key-value table
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert app_settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app_settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete app_settings" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('min_advance_percentage', '50'),
  ('material_dependency_cutting', 'Aluminium must be Received before Cutting can begin'),
  ('material_dependency_glazing', 'Glass must be Received before Glazing can begin'),
  ('material_dependency_assembly', 'Hardware must be Received before Assembly can begin');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
