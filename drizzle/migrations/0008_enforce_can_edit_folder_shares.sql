CREATE OR REPLACE FUNCTION public.has_folder_edit_access(_folder uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE up AS (
    SELECT id, parent_id FROM public.folders WHERE id = _folder
    UNION ALL
    SELECT f.id, f.parent_id FROM public.folders f JOIN up ON up.parent_id = f.id
  )
  SELECT EXISTS (
    SELECT 1 FROM public.folder_shares s JOIN up ON up.id = s.folder_id
    WHERE s.member_id = _user AND s.revoked_at IS NULL AND s.can_edit = true
  );
$function$;

DROP POLICY IF EXISTS "shared documents insert" ON public.documents;
DROP POLICY IF EXISTS "shared documents update" ON public.documents;

CREATE POLICY "shared documents insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (folder_id IS NOT NULL AND public.has_folder_edit_access(folder_id, auth.uid()));

CREATE POLICY "shared documents update" ON public.documents
FOR UPDATE TO authenticated
USING (folder_id IS NOT NULL AND public.has_folder_edit_access(folder_id, auth.uid()))
WITH CHECK (folder_id IS NOT NULL AND public.has_folder_edit_access(folder_id, auth.uid()));
