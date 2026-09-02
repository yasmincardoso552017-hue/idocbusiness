ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'juridica',
  ADD COLUMN IF NOT EXISTS cpf text;

ALTER TABLE public.signing_requests
  ADD COLUMN IF NOT EXISTS require_geo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_photo_id boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_selfie boolean NOT NULL DEFAULT false;

ALTER TABLE public.signers
  ADD COLUMN IF NOT EXISTS photo_id_path text,
  ADD COLUMN IF NOT EXISTS selfie_path text;

ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_shared_at timestamptz;

CREATE TABLE IF NOT EXISTS public.contract_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  summary text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_audits TO authenticated;
GRANT ALL ON public.contract_audits TO service_role;

ALTER TABLE public.contract_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audits owner select" ON public.contract_audits;
CREATE POLICY "audits owner select" ON public.contract_audits FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "audits owner insert" ON public.contract_audits;
CREATE POLICY "audits owner insert" ON public.contract_audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "audits owner delete" ON public.contract_audits;
CREATE POLICY "audits owner delete" ON public.contract_audits FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS contract_audits_owner_idx ON public.contract_audits(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS folders_parent_idx ON public.folders(parent_id);