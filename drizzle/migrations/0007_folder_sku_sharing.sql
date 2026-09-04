-- SKU único por pasta
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS sku text;

CREATE OR REPLACE FUNCTION public.gen_folder_sku()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'IDOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
      || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
$$;

UPDATE public.folders SET sku = public.gen_folder_sku() WHERE sku IS NULL;
ALTER TABLE public.folders ALTER COLUMN sku SET DEFAULT public.gen_folder_sku();
ALTER TABLE public.folders ALTER COLUMN sku SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS folders_sku_key ON public.folders (sku);

CREATE TABLE IF NOT EXISTS public.folder_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL,
  member_email text,
  sku text NOT NULL,
  can_edit boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS folder_shares_unique ON public.folder_shares (folder_id, member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_shares TO authenticated;
GRANT ALL ON public.folder_shares TO service_role;
ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages shares" ON public.folder_shares
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "member reads own share" ON public.folder_shares
  FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "member leaves share" ON public.folder_shares
  FOR DELETE TO authenticated USING (auth.uid() = member_id);

-- acesso herdado: a pasta compartilhada e todas as suas subpastas
CREATE OR REPLACE FUNCTION public.has_folder_access(_folder uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id FROM public.folders WHERE id = _folder
    UNION ALL
    SELECT f.id, f.parent_id FROM public.folders f JOIN up ON up.parent_id = f.id
  )
  SELECT EXISTS (
    SELECT 1 FROM public.folder_shares s JOIN up ON up.id = s.folder_id
    WHERE s.member_id = _user AND s.revoked_at IS NULL
  );
$$;

CREATE POLICY "shared folders read" ON public.folders
  FOR SELECT TO authenticated USING (public.has_folder_access(id, auth.uid()));

CREATE POLICY "shared documents read" ON public.documents
  FOR SELECT TO authenticated
  USING (folder_id IS NOT NULL AND public.has_folder_access(folder_id, auth.uid()));
CREATE POLICY "shared documents insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (folder_id IS NOT NULL AND public.has_folder_access(folder_id, auth.uid()));
CREATE POLICY "shared documents update" ON public.documents
  FOR UPDATE TO authenticated
  USING (folder_id IS NOT NULL AND public.has_folder_access(folder_id, auth.uid()));

-- ativar um SKU recebido
CREATE OR REPLACE FUNCTION public.redeem_folder_sku(_sku text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f record; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login para ativar um SKU'; END IF;
  SELECT id, owner_id INTO f FROM public.folders WHERE upper(sku) = upper(btrim(_sku));
  IF f IS NULL THEN RAISE EXCEPTION 'SKU não encontrado'; END IF;
  IF f.owner_id = uid THEN RAISE EXCEPTION 'Esta pasta já é sua'; END IF;
  INSERT INTO public.folder_shares (folder_id, owner_id, member_id, member_email, sku)
  VALUES (f.id, f.owner_id, uid, (SELECT email FROM public.profiles WHERE id = uid), upper(btrim(_sku)))
  ON CONFLICT (folder_id, member_id)
  DO UPDATE SET revoked_at = NULL;
  RETURN f.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_folder_sku(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_folder_access(uuid, uuid) TO authenticated;