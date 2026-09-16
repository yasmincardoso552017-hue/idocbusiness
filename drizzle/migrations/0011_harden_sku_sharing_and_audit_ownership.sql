CREATE OR REPLACE FUNCTION public.validate_contract_audit_ownership()
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
      RAISE EXCEPTION 'A auditoria deve pertencer à mesma conta da empresa';
    END IF;
  END IF;
  IF NEW.document_id IS NOT NULL THEN
    SELECT owner_id INTO linked_owner FROM public.documents WHERE id = NEW.document_id;
    IF linked_owner IS NULL OR NEW.owner_id IS DISTINCT FROM linked_owner THEN
      RAISE EXCEPTION 'A auditoria deve pertencer à mesma conta do documento';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_contract_audit_ownership_trigger ON public.contract_audits;
CREATE TRIGGER validate_contract_audit_ownership_trigger
BEFORE INSERT OR UPDATE ON public.contract_audits
FOR EACH ROW EXECUTE FUNCTION public.validate_contract_audit_ownership();

DROP POLICY IF EXISTS "owner manages shares" ON public.folder_shares;

CREATE POLICY "owner reads shares" ON public.folder_shares
FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "owner revokes shares" ON public.folder_shares
FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

REVOKE INSERT, UPDATE ON public.folder_shares FROM authenticated;
GRANT SELECT, DELETE ON public.folder_shares TO authenticated;
GRANT ALL ON public.folder_shares TO service_role;