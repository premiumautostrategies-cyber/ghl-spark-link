ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_value numeric NOT NULL DEFAULT 0;

ALTER TABLE public.add_ons
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.services
  ADD CONSTRAINT services_pricing_mode_check CHECK (pricing_mode IN ('flat','tiered')) NOT VALID;
ALTER TABLE public.services
  ADD CONSTRAINT services_deposit_type_check CHECK (deposit_type IN ('none','percent','fixed')) NOT VALID;
ALTER TABLE public.add_ons
  ADD CONSTRAINT add_ons_pricing_mode_check CHECK (pricing_mode IN ('flat','hourly')) NOT VALID;