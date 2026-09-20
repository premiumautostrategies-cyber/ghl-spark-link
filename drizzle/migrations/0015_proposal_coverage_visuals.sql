ALTER TABLE public.proposal_tiers
  ADD COLUMN IF NOT EXISTS coverage_kind text NOT NULL DEFAULT 'panels',
  ADD COLUMN IF NOT EXISTS coverage_keys text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.proposal_addons
  ADD COLUMN IF NOT EXISTS coverage_kind text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS coverage_keys text[] NOT NULL DEFAULT '{}';