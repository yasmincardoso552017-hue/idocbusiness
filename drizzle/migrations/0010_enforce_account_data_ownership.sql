CREATE OR REPLACE FUNCTION public.validate_company_owned_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expected_owner uuid;
BEGIN
  SELECT owner_id INTO expected_owner FROM public.companies WHERE id = NEW.company_id;
  IF expected_owner IS NULL OR NEW.owner_id IS DISTINCT FROM expected_owner THEN
    RAISE EXCEPTION 'A empresa selecionada não pertence a esta conta';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_folder_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_owner uuid;
  parent_owner uuid;
  parent_company uuid;
BEGIN
  SELECT owner_id INTO company_owner FROM public.companies WHERE id = NEW.company_id;
  IF company_owner IS NULL OR NEW.owner_id IS DISTINCT FROM company_owner THEN
    RAISE EXCEPTION 'A pasta deve pertencer à mesma conta da empresa';
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT owner_id, company_id INTO parent_owner, parent_company FROM public.folders WHERE id = NEW.parent_id;
    IF parent_owner IS NULL OR NEW.owner_id IS DISTINCT FROM parent_owner OR NEW.company_id IS DISTINCT FROM parent_company THEN
      RAISE EXCEPTION 'A subpasta deve pertencer à mesma conta e empresa da pasta superior';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_document_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_owner uuid;
  folder_owner uuid;
  folder_company uuid;
BEGIN
  IF NEW.folder_id IS NOT NULL THEN
    SELECT owner_id, company_id INTO folder_owner, folder_company FROM public.folders WHERE id = NEW.folder_id;
    IF folder_owner IS NULL OR NEW.owner_id IS DISTINCT FROM folder_owner OR NEW.company_id IS DISTINCT FROM folder_company THEN
      RAISE EXCEPTION 'O documento deve pertencer à mesma conta e empresa da pasta';
    END IF;
  ELSIF NEW.company_id IS NOT NULL THEN
    SELECT owner_id INTO company_owner FROM public.companies WHERE id = NEW.company_id;
    IF company_owner IS NULL OR NEW.owner_id IS DISTINCT FROM company_owner THEN
      RAISE EXCEPTION 'O documento deve pertencer à mesma conta da empresa';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_contract_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  linked_owner uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT owner_id INTO linked_owner FROM public.companies WHERE id = NEW.company_id;
    IF linked_owner IS NULL OR NEW.owner_id IS DISTINCT FROM linked_owner THEN
      RAISE EXCEPTION 'O contrato deve pertencer à mesma conta da empresa';
    END IF;
  END IF;
  IF NEW.document_id IS NOT NULL THEN
    SELECT owner_id INTO linked_owner FROM public.documents WHERE id = NEW.document_id;
    IF linked_owner IS NULL OR NEW.owner_id IS DISTINCT FROM linked_owner THEN
      RAISE EXCEPTION 'O contrato deve pertencer à mesma conta do documento';
    END IF;
  END IF;
  IF NEW.request_id IS NOT NULL THEN
    SELECT owner_id INTO linked_owner FROM public.signing_requests WHERE id = NEW.request_id;
    IF linked_owner IS NULL OR NEW.owner_id IS DISTINCT FROM linked_owner THEN
      RAISE EXCEPTION 'O contrato deve pertencer à mesma conta da solicitação';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_signing_request_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  document_owner uuid;
BEGIN
  SELECT owner_id INTO document_owner FROM public.documents WHERE id = NEW.document_id;
  IF document_owner IS NULL OR NEW.owner_id IS DISTINCT FROM document_owner THEN
    RAISE EXCEPTION 'A solicitação deve pertencer à mesma conta do documento';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_signer_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_owner uuid;
BEGIN
  SELECT owner_id INTO request_owner FROM public.signing_requests WHERE id = NEW.request_id;
  IF request_owner IS NULL OR NEW.owner_id IS DISTINCT FROM request_owner THEN
    RAISE EXCEPTION 'O signatário deve pertencer à mesma conta da solicitação';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_signature_field_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_owner uuid;
  field_signer_request uuid;
  field_signer_owner uuid;
BEGIN
  SELECT owner_id INTO request_owner FROM public.signing_requests WHERE id = NEW.request_id;
  IF request_owner IS NULL OR NEW.owner_id IS DISTINCT FROM request_owner THEN
    RAISE EXCEPTION 'O campo deve pertencer à mesma conta da solicitação';
  END IF;
  IF NEW.signer_id IS NOT NULL THEN
    SELECT request_id, owner_id INTO field_signer_request, field_signer_owner FROM public.signers WHERE id = NEW.signer_id;
    IF field_signer_request IS DISTINCT FROM NEW.request_id OR field_signer_owner IS DISTINCT FROM NEW.owner_id THEN
      RAISE EXCEPTION 'O campo e o signatário devem pertencer à mesma solicitação';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_folder_ownership_trigger ON public.folders;
CREATE TRIGGER validate_folder_ownership_trigger BEFORE INSERT OR UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.validate_folder_ownership();

DROP TRIGGER IF EXISTS validate_document_ownership_trigger ON public.documents;
CREATE TRIGGER validate_document_ownership_trigger BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.validate_document_ownership();

DROP TRIGGER IF EXISTS validate_contract_ownership_trigger ON public.contracts;
CREATE TRIGGER validate_contract_ownership_trigger BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.validate_contract_ownership();

DROP TRIGGER IF EXISTS validate_contract_audit_ownership_trigger ON public.contract_audits;
CREATE TRIGGER validate_contract_audit_ownership_trigger BEFORE INSERT OR UPDATE ON public.contract_audits FOR EACH ROW EXECUTE FUNCTION public.validate_contract_ownership();

DROP TRIGGER IF EXISTS validate_signing_request_ownership_trigger ON public.signing_requests;
CREATE TRIGGER validate_signing_request_ownership_trigger BEFORE INSERT OR UPDATE ON public.signing_requests FOR EACH ROW EXECUTE FUNCTION public.validate_signing_request_ownership();

DROP TRIGGER IF EXISTS validate_signer_ownership_trigger ON public.signers;
CREATE TRIGGER validate_signer_ownership_trigger BEFORE INSERT OR UPDATE ON public.signers FOR EACH ROW EXECUTE FUNCTION public.validate_signer_ownership();

DROP TRIGGER IF EXISTS validate_signature_field_ownership_trigger ON public.signature_fields;
CREATE TRIGGER validate_signature_field_ownership_trigger BEFORE INSERT OR UPDATE ON public.signature_fields FOR EACH ROW EXECUTE FUNCTION public.validate_signature_field_ownership();

DROP POLICY IF EXISTS "shared documents insert" ON public.documents;
DROP POLICY IF EXISTS "shared documents update" ON public.documents;

CREATE POLICY "shared documents insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  folder_id IS NOT NULL
  AND public.has_folder_edit_access(folder_id, auth.uid())
  AND owner_id = (SELECT owner_id FROM public.folders WHERE id = folder_id)
  AND company_id = (SELECT company_id FROM public.folders WHERE id = folder_id)
);

CREATE POLICY "shared documents update" ON public.documents
FOR UPDATE TO authenticated
USING (folder_id IS NOT NULL AND public.has_folder_edit_access(folder_id, auth.uid()))
WITH CHECK (
  folder_id IS NOT NULL
  AND public.has_folder_edit_access(folder_id, auth.uid())
  AND owner_id = (SELECT owner_id FROM public.folders WHERE id = folder_id)
  AND company_id = (SELECT company_id FROM public.folders WHERE id = folder_id)
);