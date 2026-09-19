ALTER TABLE public.services ADD COLUMN estimated_hours numeric;
ALTER TABLE public.services ADD COLUMN supports_add_ons boolean NOT NULL DEFAULT true;
UPDATE public.services SET estimated_hours = ROUND((duration_minutes::numeric / 60.0), 2) WHERE estimated_hours IS NULL;

CREATE TABLE public.service_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  estimated_hours numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_variants TO authenticated;
GRANT ALL ON public.service_variants TO service_role;
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage service variants" ON public.service_variants
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_service_variants BEFORE UPDATE ON public.service_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_service_variants_service ON public.service_variants(service_id);
CREATE INDEX idx_service_variants_org ON public.service_variants(organization_id);

CREATE TABLE public.add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  category_id uuid REFERENCES public.service_categories(id),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  estimated_hours numeric NOT NULL DEFAULT 0,
  swatch_color text,
  is_global boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_ons TO authenticated;
GRANT ALL ON public.add_ons TO service_role;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage add ons" ON public.add_ons
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_add_ons BEFORE UPDATE ON public.add_ons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_add_ons_org ON public.add_ons(organization_id);
CREATE INDEX idx_add_ons_category ON public.add_ons(category_id);
CREATE INDEX idx_add_ons_service ON public.add_ons(service_id);

CREATE TABLE public.service_add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  add_on_id uuid NOT NULL REFERENCES public.add_ons(id) ON DELETE CASCADE,
  price_override numeric,
  is_recommended boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, add_on_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_add_ons TO authenticated;
GRANT ALL ON public.service_add_ons TO service_role;
ALTER TABLE public.service_add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage service add on links" ON public.service_add_ons
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE INDEX idx_service_add_ons_service ON public.service_add_ons(service_id);
CREATE INDEX idx_service_add_ons_addon ON public.service_add_ons(add_on_id);