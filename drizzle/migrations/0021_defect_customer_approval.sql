ALTER TABLE public.inspection_defects
  ADD COLUMN customer_decision TEXT,
  ADD COLUMN decided_at TIMESTAMPTZ,
  ADD COLUMN repair_price NUMERIC;

COMMENT ON COLUMN public.inspection_defects.customer_decision IS 'Customer decision on repairing this finding: pending | approved | declined';