CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  vendor text,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'paid',
  recurrence text NOT NULL DEFAULT 'one_off',
  method text,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage org expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.user_belongs_to_organization(auth.uid(), organization_id))
WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE INDEX expenses_org_date_idx ON public.expenses (organization_id, expense_date DESC);
CREATE INDEX expenses_org_status_idx ON public.expenses (organization_id, status);

CREATE TRIGGER touch_expenses BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_url text;