-- 1. Pin search_path on the only function missing it
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 2. Lock down function EXECUTE privileges.
-- Trigger-only functions must not be callable through the API at all.
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- RLS helper functions are needed by policies evaluated as the signed-in role only.
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_organization_permission(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_belongs_to_organization(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(uuid, uuid) TO authenticated;

-- Workspace bootstrap only makes sense for a signed-in user.
REVOKE ALL ON FUNCTION public.bootstrap_user_workspace(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_workspace(text, text) TO authenticated;

-- 3. Credential tables: explicit owner-scoped policies (no client GRANTs, so the
-- Data API stays closed; service_role keeps server-side access).
DROP POLICY IF EXISTS "own connections" ON public.app_user_connections;
CREATE POLICY "own connections" ON public.app_user_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT ALL ON public.app_user_connections TO service_role;

DROP POLICY IF EXISTS "own ghl connections" ON public.ghl_connections;
CREATE POLICY "own ghl connections" ON public.ghl_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT ALL ON public.ghl_connections TO service_role;

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no client access to integration secrets" ON public.integration_secrets;
CREATE POLICY "no client access to integration secrets" ON public.integration_secrets
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
GRANT ALL ON public.integration_secrets TO service_role;

-- 4. Stamp owner_id server-side so a client cannot claim another user's row.
CREATE OR REPLACE FUNCTION public.stamp_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.stamp_owner_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_owner_id_customers ON public.customers;
CREATE TRIGGER stamp_owner_id_customers BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.stamp_owner_id();

DROP TRIGGER IF EXISTS stamp_owner_id_vehicles ON public.vehicles;
CREATE TRIGGER stamp_owner_id_vehicles BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_owner_id();

DROP TRIGGER IF EXISTS stamp_owner_id_jobs ON public.jobs;
CREATE TRIGGER stamp_owner_id_jobs BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.stamp_owner_id();

DROP TRIGGER IF EXISTS stamp_owner_id_estimates ON public.estimates;
CREATE TRIGGER stamp_owner_id_estimates BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.stamp_owner_id();
