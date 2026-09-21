CREATE TABLE public.mobile_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'van',
  base_address text,
  capacity_hours numeric NOT NULL DEFAULT 8,
  skills text[] NOT NULL DEFAULT '{}',
  tech_name text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_units TO authenticated;
GRANT ALL ON public.mobile_units TO service_role;
ALTER TABLE public.mobile_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage mobile units" ON public.mobile_units
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.mobile_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.mobile_units(id) ON DELETE SET NULL,
  route_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  start_time text NOT NULL DEFAULT '08:00',
  drive_minutes integer NOT NULL DEFAULT 0,
  work_hours numeric NOT NULL DEFAULT 0,
  summary text,
  warnings text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_routes TO authenticated;
GRANT ALL ON public.mobile_routes TO service_role;
ALTER TABLE public.mobile_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage mobile routes" ON public.mobile_routes
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_mobile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_address text,
  ADD COLUMN IF NOT EXISTS service_city text,
  ADD COLUMN IF NOT EXISTS service_zip text,
  ADD COLUMN IF NOT EXISTS travel_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrival_window text,
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES public.mobile_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stop_order integer;

CREATE INDEX IF NOT EXISTS jobs_route_idx ON public.jobs (route_id, stop_order);
CREATE INDEX IF NOT EXISTS mobile_routes_date_idx ON public.mobile_routes (organization_id, route_date);