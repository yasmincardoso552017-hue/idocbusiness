import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { admin } from "./signing.server";

/** Link temporário de um arquivo da pasta (dono ou convidado pelo SKU). */
export const folderFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ documentId: z.string().uuid(), download: z.boolean().default(false) }).parse(d),
  )
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
    const options = data.download ? { download: doc.name } : undefined;
    const signed = await db.storage
      .from("documents")
      .createSignedUrl(path, 900, options);
    if (signed.error || !signed.data?.signedUrl) {
      console.error("[vault] Falha ao criar link do arquivo", {
        documentId: doc.id,
        message: signed.error?.message,
      });
      throw new Error("Não foi possível abrir este arquivo");
    }
    return { url: signed.data.signedUrl };
  });

