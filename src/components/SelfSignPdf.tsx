import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Eraser, ImagePlus, Loader2, MapPin, PenLine, RotateCw, Type } from "lucide-react";
import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";
import { registerSelfSignedDocument } from "@/lib/self-sign.functions";

type SignatureMode = "draw" | "type" | "upload";
type Orientation = "horizontal" | "vertical";
type Position = { page: number; x: number; y: number; w: number; h: number; orientation: Orientation };

const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(values).map((value) => alphabet[value % alphabet.length]).join("");
}

function deviceLabel() {
  const agent = navigator.userAgent;
  const device = /Mobile|Android|iPhone/i.test(agent) ? "Celular" : "Computador";
  const system = /Android/i.test(agent) ? "Android" : /iPhone|iPad/i.test(agent) ? "iOS" : /Windows/i.test(agent) ? "Windows" : /Mac OS/i.test(agent) ? "macOS" : "Outro sistema";
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : /Firefox\//.test(agent) ? "Firefox" : "Outro navegador";
  return `${device} • ${system} • ${browser}`;
}

function safePdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\xFF]/g, "");
}

function maskedCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**` : "não informado";
}

function typedSignature(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 280;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Assinatura digitada indisponível neste navegador");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.font = "italic 112px 'Brush Script MT','Segoe Script',cursive";
  context.textBaseline = "middle";
  context.fillText(name, 30, 150, 930);
  return canvas.toDataURL("image/png");
}

async function embedDataImage(pdf: PDFDocument, dataUrl: string) {
  const raw = Uint8Array.from(atob(dataUrl.split(",")[1] ?? ""), (character) => character.charCodeAt(0));
  return dataUrl.startsWith("data:image/png") ? pdf.embedPng(raw) : pdf.embedJpg(raw);
}

async function rotateDataImage(dataUrl: string, orientation: Orientation) {
  if (orientation === "horizontal") return dataUrl;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Não foi possível preparar a assinatura vertical"));
    element.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Assinatura vertical indisponível neste navegador");
  context.translate(canvas.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function SelfSignPdf({ file, isAuthenticated, onResult }: { file: File; isAuthenticated: boolean; onResult: (bytes: Uint8Array, name: string) => void }) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [register, setRegister] = useState(isAuthenticated);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [position, setPosition] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);
  const dragging = useRef<{ dx: number; dy: number } | null>(null);
  const resizing = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    file.arrayBuffer()
      .then((buffer) => renderPdfPages(new Uint8Array(buffer), 820))
      .then((rendered) => { if (alive) setPages(rendered); })
      .catch(() => toast.error("Não foi possível abrir este PDF"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [file]);

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, canvas.offsetWidth * ratio);
    canvas.height = Math.max(1, canvas.offsetHeight * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
    drawn.current = false;
    setSignatureImage(null);
  }, [mode]);

  const current = pages.find((candidate) => candidate.index === page);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function finishDrawing() {
    drawing.current = false;
    if (drawn.current && canvasRef.current) setSignatureImage(canvasRef.current.toDataURL("image/png"));
  }

  function clearDrawing() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawn.current = false;
    setSignatureImage(null);
  }

  function previewSignature() {
    if (mode === "type" && name.trim().length >= 2) return typedSignature(name.trim());
    return signatureImage;
  }

  function place(event: React.PointerEvent<HTMLDivElement>) {
    if (!previewSignature()) {
      toast.error("Crie ou escolha sua assinatura primeiro");
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * (current?.width ?? 1);
    const y = ((event.clientY - rect.top) / rect.height) * (current?.height ?? 1);
    const pageWidth = current?.width ?? 400;
    const pageHeight = current?.height ?? 600;
    const longSide = Math.min(260, pageWidth * 0.38);
    const shortSide = Math.max(54, Math.min(80, longSide * 0.3));
    const width = orientation === "horizontal" ? longSide : shortSide;
    const height = orientation === "horizontal" ? shortSide : longSide;
    setPosition({
      page,
      x: Math.max(0, Math.min(pageWidth - width, x - width / 2)),
      y: Math.max(0, Math.min(pageHeight - height, y - height / 2)),
      w: width,
      h: height,
      orientation,
    });
  }

  function movePosition(event: React.PointerEvent<HTMLDivElement>) {
    if (resizing.current || !dragging.current || !position || !current) return;
    const host = event.currentTarget.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * current.width - dragging.current.dx;
    const y = ((event.clientY - rect.top) / rect.height) * current.height - dragging.current.dy;
    setPosition({ ...position, x: Math.max(0, Math.min(current.width - position.w, x)), y: Math.max(0, Math.min(current.height - position.h, y)) });
  }

  function resizePosition(event: React.PointerEvent<HTMLSpanElement>) {
    if (!resizing.current || !position || !current) return;
    const host = event.currentTarget.parentElement?.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * current.width;
    const pointerY = ((event.clientY - rect.top) / rect.height) * current.height;
    const maxWidth = current.width - position.x;
    const maxHeight = current.height - position.y;
    setPosition({
      ...position,
      w: Math.max(36, Math.min(maxWidth, pointerX - position.x)),
      h: Math.max(36, Math.min(maxHeight, pointerY - position.y)),
    });
  }

  function toggleOrientation() {
    setOrientation((value) => value === "horizontal" ? "vertical" : "horizontal");
    setPosition((value) => {
      if (!value || !current) return value;
      const nextOrientation: Orientation = value.orientation === "horizontal" ? "vertical" : "horizontal";
      const centerX = value.x + value.w / 2;
      const centerY = value.y + value.h / 2;
      const width = value.h;
      const height = value.w;
      return {
        ...value,
        orientation: nextOrientation,
        x: Math.max(0, Math.min(current.width - width, centerX - width / 2)),
        y: Math.max(0, Math.min(current.height - height, centerY - height / 2)),
        w: width,
        h: height,
      };
    });
  }

  function askLocation() {
    if (!navigator.geolocation || !window.isSecureContext) {
      toast.error("A localização não está disponível neste navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (value) => {
        setGeo(`${value.coords.latitude.toFixed(5)},${value.coords.longitude.toFixed(5)}`);
        toast.success("Localização adicionada");
      },
      () => toast.error("Localização não autorizada; você pode continuar sem ela"),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    );
  }

  async function sign() {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cleanName.length < 2 || cleanName.length > 150) { toast.error("Informe seu nome completo"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) { toast.error("Informe um e-mail válido"); return; }
    if (cpfDigits && cpfDigits.length !== 11) { toast.error("Informe um CPF válido com 11 números ou deixe em branco"); return; }
    const signature = previewSignature();
    if (!signature) { toast.error("Crie ou escolha sua assinatura"); return; }
    if (!position) { toast.error("Toque no documento para posicionar a assinatura"); return; }
    if (!accepted) { toast.error("Confirme a declaração de autoria para assinar"); return; }
    setBusy(true);
    try {
      const originalBytes = new Uint8Array(await file.arrayBuffer());
      const originalHash = await sha256(originalBytes);
      const pdf = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      const target = pdf.getPages()[position.page];
      const rendered = pages.find((candidate) => candidate.index === position.page);
      if (!target || !rendered) throw new Error("Página escolhida indisponível");
      const placedSignature = await rotateDataImage(signature, position.orientation);
      const signatureAsset = await embedDataImage(pdf, placedSignature);
      const { width: pageWidth, height: pageHeight } = target.getSize();
      const pageRotation = ((Math.round(target.getRotation().angle) % 360) + 360) % 360;
      const rotatedPage = pageRotation === 90 || pageRotation === 270;
      const visibleWidth = rotatedPage ? pageHeight : pageWidth;
      const visibleHeight = rotatedPage ? pageWidth : pageHeight;
      const boxX = (position.x / rendered.width) * visibleWidth;
      const boxY = (position.y / rendered.height) * visibleHeight;
      const boxWidth = (position.w / rendered.width) * visibleWidth;
      const boxHeight = (position.h / rendered.height) * visibleHeight;
      const assetScale = Math.min(boxWidth / signatureAsset.width, boxHeight / signatureAsset.height);
      const drawWidth = signatureAsset.width * assetScale;
      const drawHeight = signatureAsset.height * assetScale;
      const visibleX = boxX + (boxWidth - drawWidth) / 2;
      const visibleY = boxY + (boxHeight - drawHeight) / 2;
      const toPdf = (x: number, y: number) => {
        if (pageRotation === 90) return { x: y, y: x };
        if (pageRotation === 180) return { x: pageWidth - x, y };
        if (pageRotation === 270) return { x: pageWidth - y, y: pageHeight - x };
        return { x, y: pageHeight - y };
      };
      const firstCorner = toPdf(visibleX, visibleY);
      const oppositeCorner = toPdf(visibleX + drawWidth, visibleY + drawHeight);
      const left = Math.min(firstCorner.x, oppositeCorner.x);
      const right = Math.max(firstCorner.x, oppositeCorner.x);
      const bottom = Math.min(firstCorner.y, oppositeCorner.y);
      const top = Math.max(firstCorner.y, oppositeCorner.y);
      const origin = pageRotation === 90
        ? { x: right, y: bottom }
        : pageRotation === 180
          ? { x: right, y: top }
          : pageRotation === 270
            ? { x: left, y: top }
            : { x: left, y: bottom };
      target.drawImage(signatureAsset, {
        x: origin.x,
        y: origin.y,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(pageRotation),
      });
      const signedAt = new Date().toISOString();
      const verificationCode = code();
      const bodyBytes = await pdf.save();
      const signedContentHash = await sha256(bodyBytes);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const evidence = pdf.addPage([PDF_WIDTH, PDF_HEIGHT]);
      evidence.drawRectangle({ x: 0, y: PDF_HEIGHT - 58, width: PDF_WIDTH, height: 58, color: rgb(0.16, 0.22, 0.38) });
      evidence.drawText("RELATORIO DE EVIDENCIAS DA AUTOASSINATURA", { x: 38, y: PDF_HEIGHT - 36, size: 13, font: bold, color: rgb(1, 1, 1) });
      let y = PDF_HEIGHT - 88;
      const line = (label: string, value?: string, strong = false) => {
        const text = safePdfText(value === undefined ? label : `${label}: ${value}`);
        evidence.drawText(text.slice(0, 112), { x: 38, y, size: strong ? 10 : 8.5, font: strong ? bold : font, color: rgb(0.16, 0.18, 0.24) });
        y -= strong ? 18 : 14;
      };
      line("DOCUMENTO", undefined, true);
      line("Nome", file.name);
      line("Identificador do ato", verificationCode);
      line("Hash SHA-256 do original", originalHash);
      line("Hash do conteudo assinado antes deste relatorio", signedContentHash);
       line("Pagina e posicao", `${position.page + 1}; x=${Math.round(position.x)}, y=${Math.round(position.y)}; largura=${Math.round(position.w)}; altura=${Math.round(position.h)}`);
       line("Orientacao da assinatura", position.orientation === "horizontal" ? "horizontal" : "vertical");
      y -= 7;
      line("SIGNATARIO", undefined, true);
      line("Nome declarado", cleanName);
      line("CPF", maskedCpf(cpfDigits));
      line("E-mail", cleanEmail);
      line("Data e hora do dispositivo", new Date(signedAt).toLocaleString("pt-BR"));
      line("Modalidade", mode === "draw" ? "desenhada" : mode === "type" ? "digitada" : "imagem enviada");
      line("Dispositivo", deviceLabel());
      line("Localizacao autorizada", geo ?? "nao coletada");
      line("Selfie", selfie ? "incluida neste relatorio" : "nao coletada");
      line("Documento com foto", photoId ? "incluido neste relatorio" : "nao coletado");
      line("Aceite", "Declaro ser o signatario e concordo em assinar eletronicamente este documento.");

      const evidenceImages = [["ASSINATURA", signature], ["SELFIE", selfie], ["DOCUMENTO COM FOTO", photoId]] as const;
      let imageX = 38;
      const imageY = Math.max(80, y - 145);
      for (const [label, dataUrl] of evidenceImages) {
        if (!dataUrl) continue;
        const image = await embedDataImage(pdf, dataUrl);
        const maxWidth = label === "ASSINATURA" ? 210 : 125;
        const maxHeight = 100;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        evidence.drawText(label, { x: imageX, y: imageY + 110, size: 7, font: bold });
        evidence.drawImage(image, { x: imageX, y: imageY, width: image.width * ratio, height: image.height * ratio });
        imageX += maxWidth + 16;
      }
      evidence.drawText("Assinatura eletronica simples. Nao equivale automaticamente a certificado digital ICP-Brasil.", { x: 38, y: 34, size: 7.5, font, color: rgb(0.38, 0.4, 0.46) });
      const finalBytes = await pdf.save();
      const finalHash = await sha256(finalBytes);

      if (register) {
        if (!isAuthenticated) throw new Error("Entre na sua conta para registrar a verificação pública");
        await registerSelfSignedDocument({ data: {
          code: verificationCode,
          documentName: file.name.replace(/\.pdf$/i, "-assinado.pdf"),
          pdfBase64: bytesToBase64(finalBytes),
          originalHash,
          finalHash,
          signer: { name: cleanName, email: cleanEmail, cpf: cpfDigits, signedAt, method: mode, geo, device: deviceLabel() },
        } });
        toast.success(`Assinatura registrada. Código: ${verificationCode}`);
      } else {
        toast.success("Documento assinado localmente — nada foi armazenado");
      }
      onResult(finalBytes, file.name.replace(/\.pdf$/i, "-assinado"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível assinar o documento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1"><Label htmlFor="self-name">Nome completo</Label><Input id="self-name" maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="self-email">E-mail</Label><Input id="self-email" type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="self-cpf">CPF (opcional)</Label><Input id="self-cpf" inputMode="numeric" maxLength={20} value={cpf} onChange={(event) => setCpf(event.target.value)} /></div>
      </div>

      <div className="space-y-2">
        <Label>Modo de assinatura</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" size="sm" variant={mode === "draw" ? "default" : "outline"} onClick={() => setMode("draw")}><PenLine className="mr-1 size-4" />Desenhar</Button>
          <Button type="button" size="sm" variant={mode === "type" ? "default" : "outline"} onClick={() => setMode("type")}><Type className="mr-1 size-4" />Digitar</Button>
          <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} onClick={() => setMode("upload")}><ImagePlus className="mr-1 size-4" />Imagem</Button>
        </div>
        {mode === "draw" && <div className="rounded-md border border-border bg-card p-2"><canvas ref={canvasRef} className="h-36 w-full touch-none rounded bg-background" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const context = event.currentTarget.getContext("2d"); if (!context) return; drawing.current = true; drawn.current = true; const point = canvasPoint(event); context.beginPath(); context.moveTo(point.x, point.y); }} onPointerMove={(event) => { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); if (!context) return; const point = canvasPoint(event); context.lineTo(point.x, point.y); context.stroke(); }} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} /><Button type="button" size="sm" variant="ghost" onClick={clearDrawing}><Eraser className="mr-1 size-4" />Limpar</Button></div>}
        {mode === "type" && <p className="rounded-md border border-border bg-secondary/40 p-3 text-center font-serif text-2xl italic">{name.trim() || "Sua assinatura aparecerá aqui"}</p>}
        {mode === "upload" && <Input type="file" accept="image/png,image/jpeg" onChange={async (event) => { const selected = event.target.files?.[0]; if (selected) setSignatureImage(await fileToDataUrl(selected)); }} />}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/40 p-2">
        <div><p className="text-xs font-semibold">Orientação no documento</p><p className="text-[11px] text-muted-foreground">A prévia será mantida igual no PDF final.</p></div>
        <Button type="button" size="sm" variant="outline" onClick={toggleOrientation}><RotateCw className="mr-1 size-4" />{orientation === "horizontal" ? "Horizontal" : "Vertical"}</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" size="sm" variant={geo ? "default" : "outline"} onClick={askLocation}><MapPin className="mr-1 size-4" />{geo ? "Localização adicionada" : "Adicionar localização"}</Button>
        <Label className="flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-xs font-semibold"><Camera className="mr-1 size-4" />{selfie ? "Selfie adicionada" : "Adicionar selfie"}<Input type="file" accept="image/*" capture="user" className="hidden" onChange={async (event) => { const selected = event.target.files?.[0]; if (selected) setSelfie(await fileToDataUrl(selected)); }} /></Label>
        <Label className="flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-xs font-semibold"><BadgeCheck className="mr-1 size-4" />{photoId ? "Documento adicionado" : "Documento com foto"}<Input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (event) => { const selected = event.target.files?.[0]; if (selected) setPhotoId(await fileToDataUrl(selected)); }} /></Label>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
        <span>Página {page + 1} de {pages.length || "…"}</span>
        <Button type="button" size="sm" variant="outline" disabled={page >= pages.length - 1} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
      </div>

      <div className="overflow-auto rounded-lg bg-secondary/40 p-2">
        {loading || !current ? <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> : (
           <div className="relative mx-auto w-full max-w-[820px] touch-none bg-card shadow" style={{ aspectRatio: `${current.width}/${current.height}` }} onPointerDown={place}>
            <img src={current.url} alt={`Página ${page + 1}`} draggable={false} className="pointer-events-none absolute inset-0 size-full" />
             {position?.page === page && previewSignature() && <div className="absolute cursor-move border-2 border-primary bg-primary/5" style={{ left: `${(position.x / current.width) * 100}%`, top: `${(position.y / current.height) * 100}%`, width: `${(position.w / current.width) * 100}%`, height: `${(position.h / current.height) * 100}%` }} onPointerDown={(event) => { event.stopPropagation(); const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; event.currentTarget.setPointerCapture(event.pointerId); dragging.current = { dx: ((event.clientX - rect.left) / rect.width) * current.width - position.x, dy: ((event.clientY - rect.top) / rect.height) * current.height - position.y }; }} onPointerMove={movePosition} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
               <img src={previewSignature() ?? ""} alt={`Assinatura ${position.orientation}`} draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 object-contain" style={position.orientation === "vertical" ? { width: `${(position.h / position.w) * 100}%`, height: `${(position.w / position.h) * 100}%`, transform: "translate(-50%, -50%) rotate(90deg)" } : { width: "100%", height: "100%", transform: "translate(-50%, -50%)" }} />
               <span aria-label="Redimensionar assinatura" className="absolute -bottom-2 -right-2 size-5 cursor-se-resize rounded-full border-2 border-background bg-primary" onPointerDown={(event) => { event.stopPropagation(); resizing.current = true; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={resizePosition} onPointerUp={() => { resizing.current = false; }} onPointerCancel={() => { resizing.current = false; }} />
             </div>}
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Toque no ponto exato, arraste a marcação para mover e use a bolinha para ajustar o tamanho. A posição e a orientação serão mantidas no PDF final.</p>

      <Label className="flex items-start gap-2 text-xs font-normal"><Checkbox checked={accepted} onCheckedChange={(checked) => setAccepted(checked === true)} /><span>Declaro ser o signatário e concordo em assinar eletronicamente este documento. Autorizo a inclusão das provas opcionais escolhidas na página de evidências.</span></Label>
      {isAuthenticated ? <Label className="flex items-start gap-2 text-xs font-normal"><Checkbox checked={register} onCheckedChange={(checked) => setRegister(checked === true)} /><span>Salvar o PDF assinado na minha conta e ativar o código de verificação pública. Selfie, documento, CPF e localização não serão exibidos publicamente.</span></Label> : <p className="rounded-md border border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">Modo local: o PDF e as provas não serão enviados nem salvos no IDOC BUSINESS. Para ativar verificação pública, entre em uma conta antes de assinar.</p>}
      <Button type="button" className="w-full" disabled={busy || loading} onClick={sign}>{busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <PenLine className="mr-1 size-4" />}Assinar documento</Button>
    </div>
  );
}