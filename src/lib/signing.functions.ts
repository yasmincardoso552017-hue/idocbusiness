import { createServerFn, getRequest, getRequestHeader } from "@tanstack/react-start";
import { z } from "zod";

import {
  admin,
  finalizeDocument,
  logEvent,
  parseAgent,
  randomToken,
  sha256,
} from "./signing.server";

/** Abre a sessão pública de assinatura a partir do token do signatário. */
export const getSigningSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: signer } = await db
      .from("signers")
      .select("*, signing_requests(*, documents(*, companies(razao_social, nome_fantasia)))")
      .eq("token", data.token)
      .maybeSingle();
    if (!signer) return { error: "Link inválido" as const };
    if (signer.revoked) return { error: "Link revogado" as const };
    const req = signer.signing_requests as unknown as {
      id: string;
      mode: string;
      status: string;
      expires_at: string | null;
      message: string | null;
      documents: {
        id: string;
        name: string;
        page_count: number | null;
        owner_id: string;
        mime_type: string | null;
        companies: { razao_social: string; nome_fantasia: string | null } | null;
      };
    };
    if (req.expires_at && new Date(req.expires_at) < new Date())
      return { error: "Link expirado" as const };

    const { data: allSigners } = await db
      .from("signers")
      .select("id, name, order_index, status")
      .eq("request_id", req.id)
      .order("order_index");
    const { data: fields } = await db
      .from("signature_fields")
      .select("*")
      .eq("request_id", req.id)
      .eq("signer_id", signer.id);

    const blocked =
      req.mode === "sequential" &&
      (allSigners ?? []).some((s) => s.order_index < signer.order_index && s.status !== "signed");

    let fileUrl: string | null = null;
    const { data: doc } = await db
      .from("documents")
      .select("storage_path")
      .eq("id", req.documents.id)
      .single();
    if (doc?.storage_path) {
      const signed = await db.storage.from("documents").createSignedUrl(doc.storage_path, 3600);
      fileUrl = signed.data?.signedUrl ?? null;
    }

    const ua = getRequestHeader("user-agent") ?? "";
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    if (signer.status === "pending" && !signer.viewed_at) {
      await db
        .from("signers")
        .update({ viewed_at: new Date().toISOString(), status: "viewed", ip, user_agent: ua })
        .eq("id", signer.id);
      await logEvent(db, {
        owner_id: req.documents.owner_id,
        document_id: req.documents.id,
        request_id: req.id,
        actor: signer.email,
        action: "Documento visualizado pelo signatário",
        ip,
        user_agent: ua,
      });
      await db.from("notifications").insert({
        user_id: req.documents.owner_id,
        title: "Documento visualizado",
        body: `${signer.name} abriu ${req.documents.name}.`,
        type: "info",
      });
    }

    return {
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        cpf: signer.cpf,
        status: signer.status,
        order_index: signer.order_index,
      },
      request: { id: req.id, mode: req.mode, status: req.status, message: req.message },
      document: {
        id: req.documents.id,
        name: req.documents.name,
        pages: req.documents.page_count ?? 1,
        mime: req.documents.mime_type,
        company:
          req.documents.companies?.nome_fantasia || req.documents.companies?.razao_social || null,
      },
      fields: fields ?? [],
      signers: allSigners ?? [],
      blocked,
      fileUrl,
    };
  });

/** Registra a assinatura do signatário, grava evidências e finaliza o documento quando todos assinam. */
export const submitSignature = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: z.string().min(8),
        typedName: z.string().min(2),
        imageData: z.string().optional(),
        acceptedTerms: z.literal(true),
        geo: z.string().optional(),
        values: z.record(z.string(), z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: signer } = await db
      .from("signers")
      .select("*, signing_requests(*, documents(id, name, owner_id))")
      .eq("token", data.token)
      .maybeSingle();
    if (!signer || signer.revoked) throw new Error("Link inválido");
    if (signer.status === "signed") return { ok: true, alreadySigned: true };
    const req = signer.signing_requests as unknown as {
      id: string;
      mode: string;
      expires_at: string | null;
      documents: { id: string; name: string; owner_id: string };
    };
    if (req.expires_at && new Date(req.expires_at) < new Date()) throw new Error("Link expirado");

    const { data: others } = await db
      .from("signers")
      .select("id, order_index, status, required, name, email, token")
      .eq("request_id", req.id)
      .order("order_index");
    if (
      req.mode === "sequential" &&
      (others ?? []).some((s) => s.order_index < signer.order_index && s.status !== "signed")
    )
      throw new Error("Aguardando assinatura anterior");

    const url = new URL(getRequest().url);
    const ua = getRequestHeader("user-agent") ?? "";
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const agent = parseAgent(ua);
    const now = new Date().toISOString();

    await db
      .from("signers")
      .update({
        status: "signed",
        signed_at: now,
        accepted_terms: true,
        ip,
        user_agent: ua,
        device: `${agent.device} • ${agent.os} • ${agent.browser}`,
        geo: data.geo ?? null,
      })
      .eq("id", signer.id);

    await db.from("signatures").insert({
      request_id: req.id,
      signer_id: signer.id,
      owner_id: req.documents.owner_id,
      typed_name: data.typedName,
      image_data: data.imageData ?? null,
      hash: await sha256(`${signer.id}|${data.typedName}|${now}|${ip ?? ""}`),
    });

    for (const [fieldId, value] of Object.entries(data.values ?? {})) {
      await db.from("signature_fields").update({ value }).eq("id", fieldId).eq("signer_id", signer.id);
    }

    await logEvent(db, {
      owner_id: req.documents.owner_id,
      document_id: req.documents.id,
      request_id: req.id,
      actor: signer.email,
      action: "Termos aceitos e assinatura realizada",
      ip,
      user_agent: ua,
      meta: { device: agent, geo: data.geo ?? null, method: signer.auth_method },
    });
    await db.from("notifications").insert({
      user_id: req.documents.owner_id,
      title: "Assinatura realizada",
      body: `${signer.name} assinou ${req.documents.name}.`,
      type: "success",
    });

    const remaining = (others ?? []).filter((s) => s.id !== signer.id && s.status !== "signed");
    if (remaining.length === 0) {
      await finalizeDocument(db, req.id, url.origin);
      return { ok: true, completed: true };
    }
    await db
      .from("signing_requests")
      .update({ status: "partially_signed" })
      .eq("id", req.id);
    await db.from("documents").update({ status: "signing" }).eq("id", req.documents.id);
    const next = remaining[0];
    if (req.mode === "sequential" && next) {
      await logEvent(db, {
        owner_id: req.documents.owner_id,
        document_id: req.documents.id,
        request_id: req.id,
        actor: "sistema",
        action: `Próximo signatário notificado: ${next.email}`,
        meta: { link: `/sign/${next.token}` },
      });
    }
    return { ok: true, completed: false };
  });

/** Consulta pública de autenticidade do documento assinado. */
export const verifyDocument = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const code = data.code.trim().toUpperCase();
    const { data: ev } = await db
      .from("document_evidence")
      .select("*, documents(name, status, created_at)")
      .or(`verification_code.eq.${code},document_id.eq.${code.toLowerCase()}`)
      .maybeSingle();
    if (!ev) return { valid: false as const };
    const doc = ev.documents as unknown as { name: string; status: string };
    const evidence = ev.evidence as { signers?: Array<{ name: string; email: string; signed_at: string }> };
    return {
      valid: true as const,
      document: { id: ev.document_id, name: doc.name, status: doc.status },
      finalHash: ev.final_hash,
      code: ev.verification_code,
      signedAt: ev.created_at,
      signers: (evidence.signers ?? []).map((s) => ({
        name: s.name,
        email: s.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        signed_at: s.signed_at,
      })),
    };
  });

/** Envia o documento para assinatura: gera tokens seguros, registra auditoria e notificações. */
export const dispatchSigningRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: req } = await db
      .from("signing_requests")
      .select("*, documents(id, name, owner_id)")
      .eq("id", data.requestId)
      .single();
    if (!req) throw new Error("Processo não encontrado");
    const doc = req.documents as unknown as { id: string; name: string; owner_id: string };
    const { data: signers } = await db
      .from("signers")
      .select("id, name, email, token, order_index")
      .eq("request_id", req.id)
      .order("order_index");
    if (!signers?.length) throw new Error("Adicione ao menos um signatário");
    const { data: fields } = await db
      .from("signature_fields")
      .select("id, signer_id, required")
      .eq("request_id", req.id);
    if (!fields?.length) throw new Error("Posicione ao menos um campo de assinatura");
    if (fields.some((f) => f.required && !f.signer_id))
      throw new Error("Existem campos obrigatórios sem signatário definido");

    const links: Record<string, string> = {};
    const origin = new URL(getRequest().url).origin;
    for (const s of signers) {
      const token = s.token || randomToken();
      if (!s.token) await db.from("signers").update({ token }).eq("id", s.id);
      links[s.email] = `${origin}/sign/${token}`;
    }
    await db
      .from("signing_requests")
      .update({ status: "sent" })
      .eq("id", req.id);
    await db.from("documents").update({ status: "signing" }).eq("id", doc.id);
    await logEvent(db, {
      owner_id: doc.owner_id,
      document_id: doc.id,
      request_id: req.id,
      actor: "remetente",
      action: "Documento enviado para assinatura (e-mails disparados)",
      meta: { signers: signers.map((s) => s.email), mode: req.mode },
    });
    await db.from("notifications").insert({
      user_id: doc.owner_id,
      title: "Documento enviado para assinatura",
      body: `${doc.name} • ${signers.length} signatário(s).`,
      type: "info",
    });
    return { links };
  });
