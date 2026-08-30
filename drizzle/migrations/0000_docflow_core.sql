-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  phone text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  contato text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companies" ON public.companies FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- FOLDERS
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON public.folders FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  hash text,
  storage_path text,
  signed_storage_path text,
  mime_type text,
  size_bytes bigint,
  page_count int DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- CONTRACTS
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  name text NOT NULL,
  number text,
  type text,
  start_date date,
  end_date date,
  value numeric(14,2),
  auto_renew boolean NOT NULL DEFAULT false,
  notice_days int DEFAULT 30,
  responsible text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contracts" ON public.contracts FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- SIGNING REQUESTS
CREATE TABLE public.signing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'sequential',
  status text NOT NULL DEFAULT 'draft',
  message text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signing_requests TO authenticated;
GRANT ALL ON public.signing_requests TO service_role;
ALTER TABLE public.signing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests" ON public.signing_requests FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- SIGNERS
CREATE TABLE public.signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf text,
  order_index int NOT NULL DEFAULT 1,
  auth_method text NOT NULL DEFAULT 'email',
  required boolean NOT NULL DEFAULT true,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  viewed_at timestamptz,
  signed_at timestamptz,
  ip text,
  user_agent text,
  device text,
  geo text,
  accepted_terms boolean NOT NULL DEFAULT false,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signers TO authenticated;
GRANT ALL ON public.signers TO service_role;
ALTER TABLE public.signers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner signers" ON public.signers FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "signer sees own rows" ON public.signers FOR SELECT TO authenticated USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- SIGNATURE FIELDS
CREATE TABLE public.signature_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.signers(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  page int NOT NULL DEFAULT 1,
  x numeric NOT NULL DEFAULT 0.1,
  y numeric NOT NULL DEFAULT 0.1,
  w numeric NOT NULL DEFAULT 0.3,
  h numeric NOT NULL DEFAULT 0.06,
  type text NOT NULL DEFAULT 'signature',
  required boolean NOT NULL DEFAULT true,
  value text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_fields TO authenticated;
GRANT ALL ON public.signature_fields TO service_role;
ALTER TABLE public.signature_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner fields" ON public.signature_fields FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- SIGNATURES
CREATE TABLE public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
  signer_id uuid NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  typed_name text,
  image_data text,
  hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.signatures TO authenticated;
GRANT ALL ON public.signatures TO service_role;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner signatures" ON public.signatures FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- AUDIT EVENTS (append only, no update/delete policies)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  document_id uuid,
  request_id uuid,
  actor text,
  action text NOT NULL,
  ip text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner audit read" ON public.audit_events FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- DOCUMENT EVIDENCE
CREATE TABLE public.document_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.signing_requests(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  final_hash text,
  verification_code text NOT NULL UNIQUE,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_evidence TO authenticated;
GRANT ALL ON public.document_evidence TO service_role;
ALTER TABLE public.document_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner evidence" ON public.document_evidence FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- INTEGRATIONS
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_sync boolean NOT NULL DEFAULT false,
  root_folder text DEFAULT '/DocFlow',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations" ON public.integrations FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_docs_owner ON public.documents(owner_id);
CREATE INDEX idx_docs_company ON public.documents(company_id);
CREATE INDEX idx_signers_request ON public.signers(request_id);
CREATE INDEX idx_fields_request ON public.signature_fields(request_id);
CREATE INDEX idx_audit_doc ON public.audit_events(document_id);