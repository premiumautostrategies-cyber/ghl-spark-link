-- ============================================================
-- Systemize multi-tenant foundation
-- ============================================================

-- Step 1: Create new tables without RLS policies yet.
-- ------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  settings jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  permissions text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Helper functions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _organization_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ('all' = ANY(r.permissions) OR _permission_key = ANY(r.permissions))
  );
$$;

CREATE OR REPLACE FUNCTION public.has_organization_permission(_user_id uuid, _organization_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND ur.organization_id = _organization_id
      AND ('all' = ANY(r.permissions) OR _permission_key = ANY(r.permissions))
  );
$$;

-- Step 3: Add organization/location/audit columns to existing tables.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.estimate_items
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.app_user_connections
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.ghl_connections
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 4: Backfill — create an organization + default location for each
-- existing profile, assign Owner role, and attach their data.
-- ------------------------------------------------------------
DO $$
DECLARE
  p RECORD;
  org_id uuid;
  loc_id uuid;
  owner_role_id uuid;
  slug_base text;
BEGIN
  FOR p IN SELECT id, COALESCE(shop_name, 'My Shop') AS shop_name FROM public.profiles WHERE organization_id IS NULL LOOP
    slug_base := lower(regexp_replace(p.shop_name, '[^a-zA-Z0-9]+', '-', 'g'));

    INSERT INTO public.organizations (name, slug)
    VALUES (p.shop_name, slug_base || '-' || substr(md5(random()::text), 1, 6))
    RETURNING id INTO org_id;

    INSERT INTO public.locations (organization_id, name, is_default)
    VALUES (org_id, 'Main Location', true)
    RETURNING id INTO loc_id;

    INSERT INTO public.roles (organization_id, name, description, is_system, permissions)
    VALUES (org_id, 'Owner', 'Full access to the organization.', true, ARRAY['all'])
    RETURNING id INTO owner_role_id;

    INSERT INTO public.user_roles (user_id, organization_id, role_id, location_id)
    VALUES (p.id, org_id, owner_role_id, loc_id);

    UPDATE public.profiles
    SET organization_id = org_id, location_id = loc_id
    WHERE id = p.id;

    UPDATE public.customers
    SET organization_id = org_id, location_id = loc_id
    WHERE owner_id = p.id AND organization_id IS NULL;

    UPDATE public.vehicles
    SET organization_id = org_id, location_id = loc_id
    WHERE owner_id = p.id AND organization_id IS NULL;

    UPDATE public.jobs
    SET organization_id = org_id, location_id = loc_id
    WHERE owner_id = p.id AND organization_id IS NULL;

    UPDATE public.estimates
    SET organization_id = org_id, location_id = loc_id
    WHERE owner_id = p.id AND organization_id IS NULL;

    UPDATE public.estimate_items
    SET organization_id = org_id
    WHERE owner_id = p.id AND organization_id IS NULL;

    UPDATE public.app_user_connections
    SET organization_id = org_id
    WHERE user_id = p.id AND organization_id IS NULL;

    UPDATE public.ghl_connections
    SET organization_id = org_id
    WHERE user_id = p.id AND organization_id IS NULL;
  END LOOP;
END $$;

-- Step 5: Grants and RLS policies (tables exist now).
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND organization_id = organizations.id
    )
  );

CREATE POLICY "owners can update their organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_organization_permission(auth.uid(), organizations.id, 'organization:admin')
    OR public.has_organization_permission(auth.uid(), organizations.id, 'all')
  )
  WITH CHECK (
    public.has_organization_permission(auth.uid(), organizations.id, 'organization:admin')
    OR public.has_organization_permission(auth.uid(), organizations.id, 'all')
  );

GRANT SELECT, INSERT, UPDATE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view locations"
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND organization_id = locations.organization_id
    )
  );

CREATE POLICY "org admins can manage locations"
  ON public.locations
  FOR ALL
  TO authenticated
  USING (
    public.has_organization_permission(auth.uid(), locations.organization_id, 'organization:admin')
    OR public.has_organization_permission(auth.uid(), locations.organization_id, 'all')
  )
  WITH CHECK (
    public.has_organization_permission(auth.uid(), locations.organization_id, 'organization:admin')
    OR public.has_organization_permission(auth.uid(), locations.organization_id, 'all')
  );

GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND organization_id = roles.organization_id
    )
  );

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own role assignments"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "org admins can manage user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_organization_permission(auth.uid(), user_roles.organization_id, 'team:manage')
    OR public.has_organization_permission(auth.uid(), user_roles.organization_id, 'all')
  )
  WITH CHECK (
    public.has_organization_permission(auth.uid(), user_roles.organization_id, 'team:manage')
    OR public.has_organization_permission(auth.uid(), user_roles.organization_id, 'all')
  );

GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND organization_id = audit_events.organization_id
    )
  );

-- Profiles
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;

CREATE POLICY "users can view own and org member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Customers
DROP POLICY IF EXISTS "own customers" ON public.customers;

CREATE POLICY "org members can manage customers"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Vehicles
DROP POLICY IF EXISTS "own vehicles" ON public.vehicles;

CREATE POLICY "org members can manage vehicles"
  ON public.vehicles
  FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Jobs
DROP POLICY IF EXISTS "own jobs" ON public.jobs;

CREATE POLICY "org members can manage jobs"
  ON public.jobs
  FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Estimates
DROP POLICY IF EXISTS "own estimates" ON public.estimates;

CREATE POLICY "org members can manage estimates"
  ON public.estimates
  FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Estimate items
DROP POLICY IF EXISTS "own estimate items" ON public.estimate_items;

CREATE POLICY "org members can manage estimate items"
  ON public.estimate_items
  FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Step 6: Update new-user trigger to provision org + location + owner role.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  new_loc_id uuid;
  owner_role_id uuid;
  slug_base text;
BEGIN
  slug_base := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'shop_name', 'My Shop'), '[^a-zA-Z0-9]+', '-', 'g'));

  INSERT INTO public.organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'shop_name', 'My Shop'),
    slug_base || '-' || substr(md5(random()::text), 1, 6)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.locations (organization_id, name, is_default)
  VALUES (new_org_id, 'Main Location', true)
  RETURNING id INTO new_loc_id;

  INSERT INTO public.roles (organization_id, name, description, is_system, permissions)
  VALUES (new_org_id, 'Owner', 'Full access to the organization.', true, ARRAY['all'])
  RETURNING id INTO owner_role_id;

  INSERT INTO public.user_roles (user_id, organization_id, role_id, location_id)
  VALUES (NEW.id, new_org_id, owner_role_id, new_loc_id);

  INSERT INTO public.profiles (id, full_name, shop_name, organization_id, location_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'shop_name',
    new_org_id,
    new_loc_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    location_id = EXCLUDED.location_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
