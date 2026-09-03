import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomToken } from "./signing.server";

/** Estágios do "envelope" do contrato (modelo DocuSign: draft → sent → delivered → signed → completed). */
export const CONTRACT_STAGES = [
  "draft",
  "sent",
  "delivered",
  "signed",
  "completed",
] as const;

const signerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().optional(),
});

/** Cria e envia o envelope de assinatura a partir de um contrato. */
export const sendContractEnvelope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        contractId: z.string().uuid(),
        documentId: z.string().uuid(),
        mode: z.enum(["sequential", "parallel"]).default("sequential"),
        message: z.string().max(600).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        requireGeo: z.boolean().default(false),
        requirePhotoId: z.boolean().default(false),
        requireSelfie: z.boolean().default(false),
        signers: z.array(signerSchema).min(1).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const owner = context.userId;

    const { data: contract } = await db
      .from("contracts")
      .select("id, name, owner_id")
      .eq("id", data.contractId)
      .single();
    if (!contract) throw new Error("Contrato não encontrado");

    const { data: doc } = await db
      .from("documents")
      .select("id, name, page_count")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Documento não encontrado");

    const expires = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400000).toISOString()
      : null;

    const { data: req, error: reqErr } = await db
      .from("signing_requests")
      .insert({
        owner_id: owner,
        document_id: doc.id,
        mode: data.mode,
        status: "sent",
        message: data.message ?? null,
        expires_at: expires,
        require_geo: data.requireGeo,
        require_photo_id: data.requirePhotoId,
        require_selfie: data.requireSelfie,
      })
      .select("id")
      .single();
    if (reqErr || !req) throw new Error(reqErr?.message ?? "Falha ao criar envelope");

    const page = Math.max(1, doc.page_count ?? 1);
    const origin = new URL(getRequest().url).origin;
    const links: { name: string; email: string; url: string }[] = [];

    for (let i = 0; i < data.signers.length; i++) {
      const s = data.signers[i]!;
      const token = randomToken(24);
      const { data: row, error } = await db
        .from("signers")
        .insert({
          request_id: req.id,
          owner_id: owner,
          name: s.name,
          email: s.email.toLowerCase(),
          cpf: s.cpf || null,
          order_index: i + 1,
          token,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message ?? "Falha ao criar signatário");
      await db.from("signature_fields").insert({
        request_id: req.id,
        signer_id: row.id,
        owner_id: owner,
        page,
        x: 0.1,
        y: Math.min(0.82, 0.5 + i * 0.12),
        w: 0.34,
        h: 0.07,
        type: "signature",
        required: true,
      });
      links.push({ name: s.name, email: s.email, url: `${origin}/sign/${token}` });
    }

    await db.from("documents").update({ status: "signing" }).eq("id", doc.id);
    await db
      .from("contracts")
      .update({
        request_id: req.id,
        document_id: doc.id,
        stage: "sent",
        sent_at: new Date().toISOString(),
        voided_at: null,
        decline_reason: null,
      })
      .eq("id", contract.id);

    await db.from("contract_events").insert({
      owner_id: owner,
      contract_id: contract.id,
      request_id: req.id,
      event_type: "sent",
      message: `Envelope enviado a ${data.signers.length} signatário(s) (${data.mode === "sequential" ? "sequencial" : "paralelo"}).`,
      payload: { signers: data.signers.map((s) => s.email), document: doc.name },
    });

    return { requestId: req.id, links };
  });

export type ContractEnvelope = Awaited<ReturnType<typeof getContractEnvelope>>;

/** Acompanhamento do envelope: estágio, signatários, evidências e trilha de eventos. */
export const getContractEnvelope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ contractId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: contract } = await db
      .from("contracts")
      .select("*, documents(id, name, status, signed_storage_path)")
      .eq("id", data.contractId)
      .single();
    if (!contract) throw new Error("Contrato não encontrado");

    const doc = contract.documents as unknown as {
      id: string;
      name: string;
      status: string;
      signed_storage_path: string | null;
    } | null;

    const { data: events } = await db
      .from("contract_events")
      .select("*")
      .eq("contract_id", contract.id)
      .order("occurred_at", { ascending: false });

    if (!contract.request_id)
      return {
        stage: contract.stage ?? "draft",
        document: doc,
        request: null,
        signers: [] as never[],
        evidence: null,
        signedUrl: null as string | null,
        events: events ?? [],
      };

    const { data: request } = await db
      .from("signing_requests")
      .select("*")
      .eq("id", contract.request_id)
      .maybeSingle();
    const { data: signers } = await db
      .from("signers")
      .select("id, name, email, status, order_index, token, revoked, viewed_at, signed_at, ip, device, geo")
      .eq("request_id", contract.request_id)
      .order("order_index");
    const { data: evidence } = await db
      .from("document_evidence")
      .select("verification_code, final_hash, created_at")
      .eq("request_id", contract.request_id)
      .maybeSingle();

    const list = signers ?? [];
    const signed = list.filter((s) => s.status === "signed").length;
    let stage: string = contract.stage ?? "draft";
    if (request?.status === "cancelled" || contract.voided_at) stage = "voided";
    else if (request?.expires_at && new Date(request.expires_at) < new Date() && signed < list.length)
      stage = "expired";
    else if (evidence || request?.status === "completed") stage = "completed";
    else if (list.length && signed === list.length) stage = "signed";
    else if (list.some((s) => s.viewed_at)) stage = "delivered";
    else if (request?.status === "sent") stage = "sent";

    if (stage !== contract.stage) {
      await db
        .from("contracts")
        .update({
          stage,
          completed_at: stage === "completed" ? (evidence?.created_at ?? new Date().toISOString()) : contract.completed_at,
        })
        .eq("id", contract.id);
      await db.from("contract_events").insert({
        owner_id: contract.owner_id,
        contract_id: contract.id,
        request_id: contract.request_id,
        event_type: stage,
        message: `Envelope mudou para "${stage}" (${signed}/${list.length} assinaturas).`,
        payload: { signed, total: list.length },
      });
    }

    let signedUrl: string | null = null;
    if (doc?.signed_storage_path) {
      const res = await db.storage
        .from("documents")
        .createSignedUrl(doc.signed_storage_path, 3600, {
          download: `assinado-${doc.name.replace(/[^\w.-]+/g, "_")}`,
        });
      signedUrl = res.data?.signedUrl ?? null;
    }

    return {
      stage,
      document: doc,
      request,
      signers: list,
      evidence,
      signedUrl,
      events: events ?? [],
    };
  });

/** Cancela (void) o envelope do contrato, revogando todos os links. */
export const voidContractEnvelope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ contractId: z.string().uuid(), reason: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: contract } = await db
      .from("contracts")
      .select("id, owner_id, request_id")
      .eq("id", data.contractId)
      .single();
    if (!contract?.request_id) throw new Error("Contrato sem envelope ativo");

    await db.from("signers").update({ revoked: true }).eq("request_id", contract.request_id);
    await db.from("signing_requests").update({ status: "cancelled" }).eq("id", contract.request_id);
    await db
      .from("contracts")
      .update({
        stage: "voided",
        voided_at: new Date().toISOString(),
        decline_reason: data.reason ?? null,
        status: "cancelled",
      })
      .eq("id", contract.id);
    await db.from("contract_events").insert({
      owner_id: contract.owner_id,
      contract_id: contract.id,
      request_id: contract.request_id,
      event_type: "voided",
      message: data.reason ? `Envelope cancelado: ${data.reason}` : "Envelope cancelado pelo remetente.",
    });
    return { ok: true };
  });

/** Reenvia (renova) os links do envelope sem recriar o processo. */
export const resendContractEnvelope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ contractId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: contract } = await db
      .from("contracts")
      .select("id, owner_id, request_id")
      .eq("id", data.contractId)
      .single();
    if (!contract?.request_id) throw new Error("Contrato sem envelope ativo");

    const { data: signers } = await db
      .from("signers")
      .select("id, name, email, status")
      .eq("request_id", contract.request_id)
      .order("order_index");
    const origin = new URL(getRequest().url).origin;
    const links: { name: string; email: string; url: string }[] = [];
    for (const s of signers ?? []) {
      if (s.status === "signed") continue;
      const token = randomToken(24);
      await db.from("signers").update({ token, revoked: false }).eq("id", s.id);
      links.push({ name: s.name, email: s.email, url: `${origin}/sign/${token}` });
    }
    await db.from("signing_requests").update({ status: "sent" }).eq("id", contract.request_id);
    await db
      .from("contracts")
      .update({ stage: "sent", voided_at: null, decline_reason: null })
      .eq("id", contract.id);
    await db.from("contract_events").insert({
      owner_id: contract.owner_id,
      contract_id: contract.id,
      request_id: contract.request_id,
      event_type: "resent",
      message: `Links renovados para ${links.length} signatário(s) pendente(s).`,
    });
    return { links };
  });
