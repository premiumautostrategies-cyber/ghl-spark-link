-- SERVICES CATALOG
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'wrap',
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 120,
  unit text NOT NULL DEFAULT 'job',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage services" ON public.services FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- INVENTORY
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  name text NOT NULL,
  sku text,
  brand text,
  category text NOT NULL DEFAULT 'film',
  unit text NOT NULL DEFAULT 'roll',
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage inventory" ON public.inventory_items FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- SALES PIPELINE
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  customer_id uuid REFERENCES public.customers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  estimate_id uuid REFERENCES public.estimates(id),
  job_id uuid REFERENCES public.jobs(id),
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'new_lead',
  source text,
  value numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 25,
  expected_close date,
  owner_name text,
  notes text,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage deals" ON public.deals FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  customer_id uuid REFERENCES public.customers(id),
  job_id uuid REFERENCES public.jobs(id),
  estimate_id uuid REFERENCES public.estimates(id),
  amount numeric NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'payment',
  method text NOT NULL DEFAULT 'card',
  status text NOT NULL DEFAULT 'paid',
  reference text,
  paid_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  customer_id uuid REFERENCES public.customers(id),
  job_id uuid REFERENCES public.jobs(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'contract',
  status text NOT NULL DEFAULT 'draft',
  body text,
  file_url text,
  signed_at timestamptz,
  signer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage documents" ON public.documents FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- TEAM MEMBERS (staff records, not auth accounts)
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  title text NOT NULL DEFAULT 'Installer',
  specialties text[] NOT NULL DEFAULT '{}',
  pay_type text NOT NULL DEFAULT 'hourly',
  pay_rate numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage team members" ON public.team_members FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- AUTOMATIONS
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  name text NOT NULL,
  trigger_event text NOT NULL DEFAULT 'job_completed',
  delay_minutes integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'sms',
  template text,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage automations" ON public.automations FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- JOB <-> SERVICE line items
CREATE TABLE public.job_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_services TO authenticated;
GRANT ALL ON public.job_services TO service_role;
ALTER TABLE public.job_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage job services" ON public.job_services FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- touch triggers
CREATE TRIGGER touch_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_inventory BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_deals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_team_members BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_automations BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_services_org ON public.services(organization_id);
CREATE INDEX idx_inventory_org ON public.inventory_items(organization_id);
CREATE INDEX idx_deals_org_stage ON public.deals(organization_id, stage);
CREATE INDEX idx_payments_org ON public.payments(organization_id);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_team_org ON public.team_members(organization_id);
CREATE INDEX idx_automations_org ON public.automations(organization_id);
CREATE INDEX idx_job_services_job ON public.job_services(job_id);