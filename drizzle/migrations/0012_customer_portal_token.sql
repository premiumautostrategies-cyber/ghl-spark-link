ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS portal_token TEXT;

UPDATE public.customers
SET portal_token = encode(gen_random_bytes(12), 'hex')
WHERE portal_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_portal_token_key ON public.customers (portal_token);