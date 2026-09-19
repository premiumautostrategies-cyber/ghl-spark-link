-- ============ 1. COMMUNICATION ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  deal_id uuid REFERENCES public.deals(id),
  customer_id uuid REFERENCES public.customers(id),
  job_id uuid REFERENCES public.jobs(id),
  channel text NOT NULL DEFAULT 'sms',
  direction text NOT NULL DEFAULT 'out',
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  is_automated boolean NOT NULL DEFAULT false,
  author_name text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage messages" ON public.messages FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE INDEX idx_messages_deal ON public.messages(deal_id, sent_at);

CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage message templates" ON public.message_templates FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_message_templates BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 2. PROPOSALS ============
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  deal_id uuid REFERENCES public.deals(id),
  customer_id uuid REFERENCES public.customers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  token text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Proposal',
  status text NOT NULL DEFAULT 'draft',
  deposit_percent numeric NOT NULL DEFAULT 30,
  selected_tier_id uuid,
  selected_addon_ids uuid[] NOT NULL DEFAULT '{}',
  total numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  labor_hours numeric NOT NULL DEFAULT 0,
  film_feet numeric NOT NULL DEFAULT 0,
  signature_name text,
  signed_at timestamptz,
  viewed_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage proposals" ON public.proposals FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_proposals BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.proposal_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'good',
  name text NOT NULL,
  description text,
  includes text[] NOT NULL DEFAULT '{}',
  price numeric NOT NULL DEFAULT 0,
  labor_hours numeric NOT NULL DEFAULT 0,
  film_feet numeric NOT NULL DEFAULT 0,
  is_recommended boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_tiers TO authenticated;
GRANT ALL ON public.proposal_tiers TO service_role;
ALTER TABLE public.proposal_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage proposal tiers" ON public.proposal_tiers FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.proposal_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  labor_hours numeric NOT NULL DEFAULT 0,
  film_feet numeric NOT NULL DEFAULT 0,
  is_selected boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_addons TO authenticated;
GRANT ALL ON public.proposal_addons TO service_role;
ALTER TABLE public.proposal_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage proposal addons" ON public.proposal_addons FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- ============ 3. BAYS & CERTIFICATIONS ============
CREATE TABLE public.bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  name text NOT NULL,
  discipline text NOT NULL DEFAULT 'ppf',
  daily_hours_cap numeric NOT NULL DEFAULT 8,
  required_certification text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bays TO authenticated;
GRANT ALL ON public.bays TO service_role;
ALTER TABLE public.bays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage bays" ON public.bays FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_bays BEFORE UPDATE ON public.bays FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tech_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  certification text NOT NULL,
  level text NOT NULL DEFAULT 'certified',
  issued_on date,
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_certifications TO authenticated;
GRANT ALL ON public.tech_certifications TO service_role;
ALTER TABLE public.tech_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage certifications" ON public.tech_certifications FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- ============ 5. PRODUCTION PHASES ============
CREATE TABLE public.job_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  phase text NOT NULL,
  sequence integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  estimated_hours numeric NOT NULL DEFAULT 1,
  actual_minutes numeric NOT NULL DEFAULT 0,
  assigned_to text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_phases TO authenticated;
GRANT ALL ON public.job_phases TO service_role;
ALTER TABLE public.job_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage job phases" ON public.job_phases FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_job_phases BEFORE UPDATE ON public.job_phases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_job_phases_job ON public.job_phases(job_id, sequence);

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_phase_id uuid REFERENCES public.job_phases(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id),
  tech_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  minutes numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage time entries" ON public.time_entries FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- ============ 6. ROLL INVENTORY ============
CREATE TABLE public.inventory_rolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  inventory_item_id uuid REFERENCES public.inventory_items(id),
  roll_code text NOT NULL,
  brand text,
  product_line text,
  material_type text NOT NULL DEFAULT 'ppf',
  width_inches numeric NOT NULL DEFAULT 60,
  original_feet numeric NOT NULL DEFAULT 0,
  remaining_feet numeric NOT NULL DEFAULT 0,
  reserved_feet numeric NOT NULL DEFAULT 0,
  reorder_point_feet numeric NOT NULL DEFAULT 25,
  lot_number text,
  batch_id text,
  cost_per_foot numeric NOT NULL DEFAULT 0,
  vendor text,
  shelf text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_rolls TO authenticated;
GRANT ALL ON public.inventory_rolls TO service_role;
ALTER TABLE public.inventory_rolls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage rolls" ON public.inventory_rolls FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_inventory_rolls BEFORE UPDATE ON public.inventory_rolls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.roll_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  roll_id uuid NOT NULL REFERENCES public.inventory_rolls(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id),
  deal_id uuid REFERENCES public.deals(id),
  kind text NOT NULL DEFAULT 'usage',
  feet numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roll_transactions TO authenticated;
GRANT ALL ON public.roll_transactions TO service_role;
ALTER TABLE public.roll_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage roll transactions" ON public.roll_transactions FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  vendor text NOT NULL,
  po_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total numeric NOT NULL DEFAULT 0,
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_purchase_orders BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  product_line text,
  width_inches numeric NOT NULL DEFAULT 60,
  feet numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  received boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage po items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- ============ 7. QC ============
CREATE TABLE public.qc_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  inspector text,
  edge_temp_f numeric,
  notes text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_checklists TO authenticated;
GRANT ALL ON public.qc_checklists TO service_role;
ALTER TABLE public.qc_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage qc checklists" ON public.qc_checklists FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_qc_checklists BEFORE UPDATE ON public.qc_checklists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.qc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  checklist_id uuid NOT NULL REFERENCES public.qc_checklists(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'check',
  is_required boolean NOT NULL DEFAULT true,
  passed boolean NOT NULL DEFAULT false,
  value_text text,
  note text,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_items TO authenticated;
GRANT ALL ON public.qc_items TO service_role;
ALTER TABLE public.qc_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage qc items" ON public.qc_items FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

-- ============ 8. WARRANTY & AFTERCARE ============
CREATE TABLE public.warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  customer_id uuid REFERENCES public.customers(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  job_id uuid REFERENCES public.jobs(id),
  certificate_number text NOT NULL,
  token text NOT NULL UNIQUE,
  product text,
  coverage_terms text,
  roll_lots text[] NOT NULL DEFAULT '{}',
  installer text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranties TO authenticated;
GRANT ALL ON public.warranties TO service_role;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage warranties" ON public.warranties FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_warranties BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.aftercare_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  body text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aftercare_tasks TO authenticated;
GRANT ALL ON public.aftercare_tasks TO service_role;
ALTER TABLE public.aftercare_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage aftercare" ON public.aftercare_tasks FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));
CREATE TRIGGER touch_aftercare_tasks BEFORE UPDATE ON public.aftercare_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ EXTENSIONS TO EXISTING TABLES ============
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS bay_id uuid REFERENCES public.bays(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS estimated_hours numeric NOT NULL DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qc_status text NOT NULL DEFAULT 'not_started';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS key_released boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS roll_id uuid REFERENCES public.inventory_rolls(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS film_feet_estimate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cut_file_url text;

ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS waiver_token text;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS signature_name text;
ALTER TABLE public.inspection_defects ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.inspection_defects ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deposit_percent numeric NOT NULL DEFAULT 30;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS review_url text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS speed_to_lead_at timestamptz;