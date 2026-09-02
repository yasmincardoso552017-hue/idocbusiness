import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { admin, randomToken } from "./signing.server";

/** Liga ou desliga o link público de uma pasta da empresa. */
export const shareFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ folderId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.enabled) {
      await context.supabase
        .from("folders")
        .update({ public_token: null, public_shared_at: null })
        .eq("id", data.folderId);
      return { token: null as string | null };
    }
    const token = randomToken(24);
    const { error } = await context.supabase
      .from("folders")
      .update({ public_token: token, public_shared_at: new Date().toISOString() })
      .eq("id", data.folderId);
    if (error) throw new Error(error.message);
    return { token };
  });

export type PublicFile = {
  id: string;
  name: string;
  size: number | null;
  folder: string;
  url: string | null;
};

/** Consulta pública dos arquivos de uma pasta compartilhada. */
export const getPublicFolder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: root } = await db
      .from("folders")
      .select("id, name, company_id, companies(razao_social, nome_fantasia)")
      .eq("public_token", data.token)
      .maybeSingle();
    if (!root) return { error: "Link inválido ou revogado" as const };

    const { data: all } = await db
      .from("folders")
      .select("id, name, parent_id")
      .eq("company_id", root.company_id);
    const tree = all ?? [];
    const ids: string[] = [root.id];
    const names = new Map<string, string>([[root.id, root.name]]);
    let frontier = [root.id];
    while (frontier.length) {
      const next: string[] = [];
      for (const f of tree) {
        if (f.parent_id && frontier.includes(f.parent_id) && !ids.includes(f.id)) {
          ids.push(f.id);
          next.push(f.id);
          names.set(f.id, `${names.get(f.parent_id) ?? ""}/${f.name}`);
        }
      }
      frontier = next;
    }

    const { data: docs } = await db
      .from("documents")
      .select("id, name, size_bytes, folder_id, storage_path, signed_storage_path")
      .in("folder_id", ids)
      .order("name");

    const files: PublicFile[] = [];
    for (const d of docs ?? []) {
      const path = d.signed_storage_path ?? d.storage_path;
      let url: string | null = null;
      if (path) {
        const signed = await db.storage.from("documents").createSignedUrl(path, 3600);
        url = signed.data?.signedUrl ?? null;
      }
      files.push({
        id: d.id,
        name: d.name,
        size: d.size_bytes,
        folder: names.get(d.folder_id ?? "") ?? root.name,
        url,
      });
    }

    const company = root.companies as unknown as {
      razao_social: string;
      nome_fantasia: string | null;
    } | null;
    return {
      folder: root.name,
      company: company?.nome_fantasia || company?.razao_social || null,
      files,
    };
  });
