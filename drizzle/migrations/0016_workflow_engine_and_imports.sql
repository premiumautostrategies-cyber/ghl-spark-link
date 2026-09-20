CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL DEFAULT 'lead_created',
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  builder text NOT NULL DEFAULT 'visual',
  is_active boolean NOT NULL DEFAULT false,
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage workflows" ON public.workflows
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  mode text NOT NULL DEFAULT 'test',
  trigger_summary text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage workflow runs" ON public.workflow_runs
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  source_system text,
  target text NOT NULL DEFAULT 'customers',
  file_name text,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage import batches" ON public.import_batches
  FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE INDEX idx_workflows_org ON public.workflows(organization_id);
CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs(workflow_id, started_at DESC);
CREATE INDEX idx_import_batches_org ON public.import_batches(organization_id, created_at DESC);