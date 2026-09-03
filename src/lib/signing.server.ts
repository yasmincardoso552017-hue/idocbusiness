import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import QRCode from "qrcode";

export type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function sha256(bytes: Uint8Array | string) {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseAgent(ua: string) {
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Desconhecido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Desconhecido";
  const device = /Mobile|Android|iPhone/i.test(ua) ? "Celular" : "Desktop";
  return { os, browser, device };
}

export function randomToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 48);
}

export function verificationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}

export async function logEvent(
  db: Admin,
  row: {
    owner_id?: string | null;
    document_id?: string | null;
    request_id?: string | null;
    actor?: string | null;
    action: string;
    ip?: string | null;
    user_agent?: string | null;
    meta?: Record<string, unknown>;
  },
) {
  await db
    .from("audit_events")
    .insert({ ...row, meta: JSON.parse(JSON.stringify(row.meta ?? {})) });
}

async function drawQr(pdf: PDFDocument, page: import("pdf-lib").PDFPage, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const cell = size / count;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({
          x: x + c * cell,
          y: y + size - (r + 1) * cell,
          width: cell,
          height: cell,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
  void pdf;
}

type Signer = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  order_index: number;
  auth_method: string;
  ip: string | null;
  user_agent: string | null;
  device: string | null;
  geo: string | null;
  signed_at: string | null;
  viewed_at: string | null;
  accepted_terms: boolean;
  photo_id_path: string | null;
  selfie_path: string | null;
};

/** Gera o PDF final assinado: assinaturas posicionadas, rodapé em todas as páginas e página de evidências. */
export async function finalizeDocument(db: Admin, requestId: string, baseUrl: string) {
  const { data: req } = await db
    .from("signing_requests")
    .select("*, documents(*)")
    .eq("id", requestId)
    .single();
  if (!req) throw new Error("Processo não encontrado");
  const doc = req.documents as unknown as {
    id: string;
    name: string;
    owner_id: string;
    storage_path: string | null;
    mime_type: string | null;
    hash: string | null;
    company_id: string | null;
  };

  const { data: signers } = await db
    .from("signers")
    .select("*")
    .eq("request_id", requestId)
    .order("order_index");
  const { data: fields } = await db.from("signature_fields").select("*").eq("request_id", requestId);
  const { data: sigs } = await db.from("signatures").select("*").eq("request_id", requestId);
  const { data: events } = await db
    .from("audit_events")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at");

  let pdf: PDFDocument;
  const isPdf = (doc.mime_type ?? "").includes("pdf");
  if (isPdf && doc.storage_path) {
    const file = await db.storage.from("documents").download(doc.storage_path);
    if (file.error || !file.data) throw new Error("Arquivo original indisponível");
    pdf = await PDFDocument.load(await file.data.arrayBuffer(), { ignoreEncryption: true });
  } else {
    pdf = await PDFDocument.create();
    const p = pdf.addPage([595, 842]);
    const f = await pdf.embedFont(StandardFonts.Helvetica);
    p.drawText("Documento: " + doc.name, { x: 48, y: 780, size: 13, font: f });
    p.drawText("Arquivo original preservado no cofre digital (formato nao-PDF).", {
      x: 48,
      y: 756,
      size: 10,
      font: f,
      color: rgb(0.35, 0.35, 0.4),
    });
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  // Assinaturas posicionadas
  for (const f of fields ?? []) {
    const page = pages[Math.min(Math.max((f.page ?? 1) - 1, 0), pages.length - 1)];
    if (!page) continue;
    const { width, height } = page.getSize();
    const s = (signers ?? []).find((x) => x.id === f.signer_id) as Signer | undefined;
    const sig = (sigs ?? []).find((x) => x.signer_id === f.signer_id);
    const bx = Number(f.x) * width;
    const bw = Number(f.w) * width;
    const bh = Number(f.h) * height;
    const by = height - Number(f.y) * height - bh;
    let text = "";
    if (f.type === "signature" || f.type === "initials")
      text = sig?.typed_name || s?.name || "";
    else if (f.type === "name") text = s?.name ?? "";
    else if (f.type === "cpf") text = s?.cpf ?? "";
    else if (f.type === "date")
      text = s?.signed_at ? new Date(s.signed_at).toLocaleDateString("pt-BR") : "";
    else if (f.type === "checkbox") text = "X";
    else text = f.value ?? "";
    if (!text) continue;

    if (f.type === "signature" || f.type === "initials") {
      const img = sig?.image_data;
      if (img && img.startsWith("data:image/png;base64,")) {
        try {
          const png = await pdf.embedPng(img);
          page.drawImage(png, { x: bx, y: by, width: bw, height: bh });
        } catch {
          page.drawText(text, { x: bx + 2, y: by + bh / 2 - 5, size: 11, font: bold });
        }
      } else {
        page.drawText(text, { x: bx + 2, y: by + bh / 2 - 5, size: 11, font: bold });
      }
      page.drawLine({
        start: { x: bx, y: by },
        end: { x: bx + bw, y: by },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.45),
      });
      page.drawText(`${s?.name ?? ""} • ${s?.email ?? ""}`, {
        x: bx,
        y: by - 8,
        size: 5.5,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
    } else {
      page.drawText(text, { x: bx + 2, y: by + bh / 2 - 4, size: 9, font });
    }
  }

  const code = verificationCode();
  const verifyUrl = `${baseUrl}/verify?code=${code}`;

  // Página de evidências
  const ev = pdf.addPage([595, 842]);
  let y = 800;
  const line = (t: string, size = 9, f = font, color = rgb(0.15, 0.15, 0.2)) => {
    if (y < 60) {
      y = 800;
      const np = pdf.addPage([595, 842]);
      pagesExtra.push(np);
      current = np;
    }
    current.drawText(t.slice(0, 120), { x: 42, y, size, font: f, color });
    y -= size + 5;
  };
  const pagesExtra: import("pdf-lib").PDFPage[] = [ev];
  let current = ev;
  current.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.16, 0.22, 0.38) });
  current.drawText("RELATORIO DE EVIDENCIAS DA ASSINATURA", {
    x: 42,
    y: 810,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y = 770;
  line("DOCUMENTO", 10, bold);
  line(`Nome: ${doc.name}`);
  line(`Identificador unico: ${doc.id}`);
  line(`Processo de assinatura: ${requestId}`);
  line(`Hash do original (SHA-256): ${doc.hash ?? "-"}`);
  line(`Codigo de verificacao: ${code}`);
  line(`Conclusao: ${new Date().toLocaleString("pt-BR")}`);
  y -= 6;
  line("SIGNATARIOS", 10, bold);
  for (const s of (signers ?? []) as unknown as Signer[]) {
    line(`${s.order_index}. ${s.name} — ${s.email}`, 9, bold);
    line(`   CPF: ${s.cpf ?? "-"} | Telefone: ${s.phone ?? "-"} | Metodo: ${s.auth_method}`);
    line(
      `   Visualizado: ${s.viewed_at ? new Date(s.viewed_at).toLocaleString("pt-BR") : "-"} | Assinado: ${s.signed_at ? new Date(s.signed_at).toLocaleString("pt-BR") : "-"}`,
    );
    line(`   IP: ${s.ip ?? "-"} | Dispositivo: ${s.device ?? "-"} | Local: ${s.geo ?? "nao coletado"}`);
    line(`   Aceite dos termos: ${s.accepted_terms ? "sim" : "nao"}`);
    line(
      `   Documento com foto: ${s.photo_id_path ? "coletado" : "nao solicitado"} | Selfie: ${s.selfie_path ? "coletada" : "nao solicitada"}`,
    );
    line(`   User agent: ${(s.user_agent ?? "-").slice(0, 95)}`, 7);
  }
  // Provas visuais coletadas (documento com foto e selfie)
  const visuals = (signers ?? []).filter(
    (s) => (s as unknown as Signer).photo_id_path || (s as unknown as Signer).selfie_path,
  ) as unknown as Signer[];
  if (visuals.length) {
    y -= 6;
    line("PROVAS VISUAIS COLETADAS", 10, bold);
    for (const s of visuals) {
      const boxW = 120;
      const boxH = 96;
      if (y - boxH - 24 < 60) {
        const np = pdf.addPage([595, 842]);
        pagesExtra.push(np);
        current = np;
        y = 790;
      }
      line(s.name, 8, bold);
      let x = 42;
      for (const path of [s.photo_id_path, s.selfie_path]) {
        if (!path) continue;
        try {
          const file = await db.storage.from("documents").download(path);
          if (file.error || !file.data) continue;
          const buf = new Uint8Array(await file.data.arrayBuffer());
          const img = path.endsWith(".png") ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
          const scale = Math.min(boxW / img.width, boxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          current.drawImage(img, { x, y: y - h, width: w, height: h });
          current.drawText(path.includes("photo_id") ? "Documento com foto" : "Selfie", {
            x,
            y: y - boxH - 9,
            size: 6,
            font,
            color: rgb(0.4, 0.4, 0.45),
          });
          x += boxW + 16;
        } catch {
          /* prova indisponivel */
        }
      }
      y -= boxH + 22;
    }
  }

  y -= 6;
  line("HISTORICO DE EVENTOS", 10, bold);
  for (const e of events ?? []) {
    line(
      `${new Date(e.created_at).toLocaleString("pt-BR")} • ${e.action} • ${e.actor ?? "-"} • IP ${e.ip ?? "-"}`,
      7.5,
    );
  }
  y -= 8;
  line("Verifique a autenticidade em: " + verifyUrl, 8, font, rgb(0.2, 0.3, 0.55));
  line(
    "A IDOC BUSINESS registra evidencias tecnicas para maximizar a forca probatoria e a integridade documental.",
    7,
    font,
    rgb(0.45, 0.45, 0.5),
  );
  await drawQr(pdf, current, verifyUrl, 440, 60, 110);
  current.drawText("QR de verificacao", { x: 452, y: 50, size: 6, font, color: rgb(0.4, 0.4, 0.45) });

  // Rodapé de evidências em todas as páginas
  const shortHash = (doc.hash ?? "").slice(0, 8);
  const footer = `IDOC BUSINESS • ID: ${doc.id.slice(0, 8).toUpperCase()} • Cod: ${code} • Hash: ${shortHash}... • Assinado em ${new Date().toLocaleDateString("pt-BR")}`;
  for (const p of pdf.getPages()) {
    const { width } = p.getSize();
    p.drawRectangle({ x: 0, y: 0, width, height: 16, color: rgb(1, 1, 1), opacity: 0.85 });
    p.drawText(footer, { x: 18, y: 6, size: 5.6, font, color: rgb(0.32, 0.34, 0.42) });
  }
  void degrees;

  const bytes = await pdf.save();
  const finalHash = await sha256(bytes);
  const path = `${doc.owner_id}/${doc.id}/assinado-${Date.now()}.pdf`;
  const up = await db.storage
    .from("documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw new Error(up.error.message);

  await db
    .from("documents")
    .update({ status: "signed", signed_storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", doc.id);
  await db
    .from("signing_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", requestId);
  await db.from("document_evidence").insert({
    document_id: doc.id,
    request_id: requestId,
    owner_id: doc.owner_id,
    final_hash: finalHash,
    verification_code: code,
    evidence: {
      signers: (signers ?? []).map((s) => ({
        name: s.name,
        email: s.email,
        signed_at: s.signed_at,
        ip: s.ip,
        device: s.device,
        method: s.auth_method,
      })),
      original_hash: doc.hash,
      completed_at: new Date().toISOString(),
    },
  });
  const nowIso = new Date().toISOString();
  const { data: linked } = await db
    .from("contracts")
    .select("id, owner_id")
    .or(`request_id.eq.${requestId},document_id.eq.${doc.id}`);
  for (const c of linked ?? []) {
    await db
      .from("contracts")
      .update({
        status: "active",
        stage: "completed",
        request_id: requestId,
        document_id: doc.id,
        completed_at: nowIso,
      })
      .eq("id", c.id);
    await db.from("contract_events").insert({
      owner_id: c.owner_id,
      contract_id: c.id,
      request_id: requestId,
      event_type: "completed",
      message: "Envelope concluído: PDF final assinado gerado com evidências.",
      payload: { verification_code: code, final_hash: finalHash },
    });
  }
  await logEvent(db, {
    owner_id: doc.owner_id,
    document_id: doc.id,
    request_id: requestId,
    actor: "sistema",
    action: "Documento finalizado e PDF final gerado",
    meta: { final_hash: finalHash, verification_code: code },
  });
  await db.from("notifications").insert({
    user_id: doc.owner_id,
    title: "Documento assinado por todos",
    body: `${doc.name} foi concluído. PDF final disponível.`,
    type: "success",
  });
  return { path, finalHash, code };
}
