import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { admin } from "./signing.server";

/** Link temporário de um arquivo da pasta (dono ou convidado pelo SKU). */
export const folderFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, name, storage_path, signed_storage_path")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error || !doc) throw new Error("Documento não encontrado ou sem acesso");
    const path = doc.signed_storage_path ?? doc.storage_path;
    if (!path) return { url: null as string | null };
    const db = await admin();
    const signed = await db.storage
      .from("documents")
      .createSignedUrl(path, 3600, { download: doc.name });
    return { url: signed.data?.signedUrl ?? null };
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
  .handler(async () => {
    return { error: "Link público desativado. Entre na sua conta e ative o SKU da pasta." as const };
  });
