CREATE TABLE public.dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  preset text NOT NULL DEFAULT 'executive',
  widget_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_revenue_target numeric NOT NULL DEFAULT 5000,
  monthly_revenue_target numeric NOT NULL DEFAULT 100000,
  average_ticket_target numeric NOT NULL DEFAULT 2500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_preferences TO authenticated;
GRANT ALL ON public.dashboard_preferences TO service_role;

ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their dashboard preferences"
ON public.dashboard_preferences
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_belongs_to_organization(auth.uid(), organization_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.user_belongs_to_organization(auth.uid(), organization_id)
);

CREATE INDEX dashboard_preferences_org_user_idx
ON public.dashboard_preferences (organization_id, user_id);

CREATE TRIGGER touch_dashboard_preferences
BEFORE UPDATE ON public.dashboard_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.deals
ADD COLUMN loss_reason text;

CREATE INDEX deals_loss_reason_idx
ON public.deals (organization_id, loss_reason)
WHERE deleted_at IS NULL AND stage = 'lost';