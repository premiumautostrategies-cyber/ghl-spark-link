CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  name text NOT NULL,
  slug text,
  description text,
  accent_color text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage service categories" ON public.service_categories
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_service_categories BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_service_categories_org ON public.service_categories(organization_id);

ALTER TABLE public.services ADD COLUMN category_id uuid REFERENCES public.service_categories(id);
ALTER TABLE public.services ADD COLUMN image_url text;
ALTER TABLE public.services ADD COLUMN customer_description text;
ALTER TABLE public.services ADD COLUMN coverage_panels text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN swatch_color text;
ALTER TABLE public.services ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX idx_services_category ON public.services(category_id);

CREATE TABLE public.service_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'addon',
  price_delta numeric NOT NULL DEFAULT 0,
  duration_delta_minutes integer NOT NULL DEFAULT 0,
  swatch_color text,
  coverage_panels text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_options TO authenticated;
GRANT ALL ON public.service_options TO service_role;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage service options" ON public.service_options
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_service_options BEFORE UPDATE ON public.service_options
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_service_options_service ON public.service_options(service_id);