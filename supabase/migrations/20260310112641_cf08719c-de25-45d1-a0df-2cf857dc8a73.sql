
CREATE TABLE public.coating_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coating_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view coating_vendors" ON public.coating_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert coating_vendors" ON public.coating_vendors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update coating_vendors" ON public.coating_vendors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete coating_vendors" ON public.coating_vendors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
