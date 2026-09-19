ALTER TABLE public.deals ADD COLUMN service_tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX deals_service_tags_idx ON public.deals USING gin (service_tags);