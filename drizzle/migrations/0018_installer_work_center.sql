ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE TABLE IF NOT EXISTS public.ops_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  actor text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_alerts_org_created_idx ON public.ops_alerts (organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_alerts TO authenticated;
GRANT ALL ON public.ops_alerts TO service_role;

ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage ops alerts"
ON public.ops_alerts
FOR ALL
TO authenticated
USING (public.user_belongs_to_organization(auth.uid(), organization_id))
WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));