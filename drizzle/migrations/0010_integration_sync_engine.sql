CREATE TABLE public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  account_label text,
  external_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage integration connections"
  ON public.integration_connections FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.integration_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  realm_id text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_secrets TO service_role;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  local_type text NOT NULL,
  local_id uuid NOT NULL,
  remote_id text NOT NULL,
  remote_url text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider, local_type, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_mappings TO authenticated;
GRANT ALL ON public.integration_mappings TO service_role;
ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage integration mappings"
  ON public.integration_mappings FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE TABLE public.sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL,
  local_type text,
  local_id uuid,
  direction text NOT NULL DEFAULT 'outbound',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  remote_id text,
  summary text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_events TO authenticated;
GRANT ALL ON public.sync_events TO service_role;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage sync events"
  ON public.sync_events FOR ALL TO authenticated
  USING (public.user_belongs_to_organization(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE INDEX idx_sync_events_queue ON public.sync_events (status, next_attempt_at);
CREATE INDEX idx_sync_events_org_created ON public.sync_events (organization_id, created_at DESC);
CREATE INDEX idx_integration_connections_org ON public.integration_connections (organization_id);

CREATE TRIGGER touch_integration_connections BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_sync_events BEFORE UPDATE ON public.sync_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();