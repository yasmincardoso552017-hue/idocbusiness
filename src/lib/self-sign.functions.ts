import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registerSchema = z.object({
  code: z.string().regex(/^[A-Z2-9]{10}$/),
  documentName: z.string().trim().min(1).max(180),
  pdfBase64: z.string().min(100).max(28_000_000),
  originalHash: z.string().regex(/^[a-f0-9]{64}$/),
  finalHash: z.string().regex(/^[a-f0-9]{64}$/),
  signer: z.object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(255),
    cpf: z.string().trim().max(20),
    signedAt: z.string().datetime(),
    method: z.enum(["draw", "type", "upload"]),
    geo: z.string().max(80).nullable(),
    device: z.string().max(250),
  }),
});

function decodeBase64(value: string) {
  const raw = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  return Uint8Array.from(atob(raw), (character) => character.charCodeAt(0));
}

/** Persiste somente a autoassinatura escolhida por um usuário autenticado. */
export const registerSelfSignedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: duplicate } = await db
      .from("document_evidence")
      .select("id")
      .eq("verification_code", data.code)
      .maybeSingle();
    if (duplicate) throw new Error("Código de verificação já utilizado. Gere o documento novamente.");

    const pdf = decodeBase64(data.pdfBase64);
    const documentId = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const signerId = crypto.randomUUID();
    const safeName = data.documentName.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 140) || "documento.pdf";
    const path = `${context.userId}/${documentId}/assinado-${safeName.replace(/\.pdf$/i, "")}.pdf`;
    const upload = await db.storage.from("documents").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) throw new Error("Não foi possível guardar o PDF assinado");

    const { error: documentError } = await db.from("documents").insert({
      id: documentId,
      owner_id: context.userId,
      name: data.documentName,
      mime_type: "application/pdf",
      size_bytes: pdf.byteLength,
      hash: data.originalHash,
      status: "signed",
      signed_storage_path: path,
    });
    if (documentError) throw new Error("Não foi possível registrar o documento");

    const { error: requestError } = await db.from("signing_requests").insert({
      id: requestId,
      owner_id: context.userId,
      document_id: documentId,
      mode: "self",
      status: "completed",
    });
    if (requestError) throw new Error("Não foi possível registrar o ato de assinatura");

    const { error: signerError } = await db.from("signers").insert({
      id: signerId,
      request_id: requestId,
      owner_id: context.userId,
      claimed_by: context.userId,
      name: data.signer.name,
      email: data.signer.email.toLowerCase(),
      cpf: data.signer.cpf || null,
      order_index: 1,
      token: crypto.randomUUID().replaceAll("-", ""),
      status: "signed",
      signed_at: data.signer.signedAt,
      accepted_terms: true,
      auth_method: `self_${data.signer.method}`,
      geo: data.signer.geo,
      device: data.signer.device,
    });
    if (signerError) throw new Error("Não foi possível registrar o signatário");

    await db.from("signatures").insert({
      request_id: requestId,
      signer_id: signerId,
      owner_id: context.userId,
      typed_name: data.signer.name,
      hash: data.finalHash,
    });

    const { error: evidenceError } = await db.from("document_evidence").insert({
      document_id: documentId,
      request_id: requestId,
      owner_id: context.userId,
      verification_code: data.code,
      final_hash: data.finalHash,
      evidence: {
        kind: "self_signature",
        signers: [{
          name: data.signer.name,
          email: data.signer.email.toLowerCase(),
          signed_at: data.signer.signedAt,
        }],
      },
    });
    if (evidenceError) throw new Error("Não foi possível registrar a verificação pública");

    return { code: data.code, documentId };
  });