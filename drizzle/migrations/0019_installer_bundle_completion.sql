CREATE TABLE public.installer_completion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'install',
  label TEXT NOT NULL,
  item_kind TEXT NOT NULL DEFAULT 'install_area',
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, phase, item_kind, label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installer_completion_items TO authenticated;
GRANT ALL ON public.installer_completion_items TO service_role;

ALTER TABLE public.installer_completion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage installer completion items"
ON public.installer_completion_items
FOR ALL
TO authenticated
USING (public.user_belongs_to_organization(auth.uid(), organization_id))
WITH CHECK (public.user_belongs_to_organization(auth.uid(), organization_id));

CREATE INDEX installer_completion_items_job_idx
ON public.installer_completion_items(job_id, phase, sort_order);

CREATE TRIGGER touch_installer_completion_items
BEFORE UPDATE ON public.installer_completion_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "org members upload job documentation"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-documentation'
  AND public.user_belongs_to_organization(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "org members view job documentation"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-documentation'
  AND public.user_belongs_to_organization(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "org members update job documentation"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-documentation'
  AND public.user_belongs_to_organization(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'job-documentation'
  AND public.user_belongs_to_organization(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "org members delete job documentation"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-documentation'
  AND public.user_belongs_to_organization(auth.uid(), ((storage.foldername(name))[1])::uuid)
);