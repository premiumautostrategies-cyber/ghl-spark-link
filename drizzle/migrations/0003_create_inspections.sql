CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  job_id uuid REFERENCES public.jobs(id),
  customer_id uuid REFERENCES public.customers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  stage text NOT NULL DEFAULT 'check_in',
  status text NOT NULL DEFAULT 'open',
  mileage integer,
  inspector text,
  notes text,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage inspections" ON public.inspections
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.inspection_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  panel text NOT NULL,
  defect_type text NOT NULL DEFAULT 'chip',
  severity text NOT NULL DEFAULT 'minor',
  note text,
  pos_x numeric NOT NULL DEFAULT 0,
  pos_y numeric NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_defects TO authenticated;
GRANT ALL ON public.inspection_defects TO service_role;
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage inspection defects" ON public.inspection_defects
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE INDEX idx_inspections_org ON public.inspections(organization_id);
CREATE INDEX idx_inspections_vehicle ON public.inspections(vehicle_id);
CREATE INDEX idx_inspection_defects_inspection ON public.inspection_defects(inspection_id);

CREATE TRIGGER touch_inspections BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();