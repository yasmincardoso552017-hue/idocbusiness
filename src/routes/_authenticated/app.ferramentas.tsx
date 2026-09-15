import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Combine,
  Scissors,
  RotateCw,
  Droplets,
  Wrench,
  Trash2,
  Images,
  Hash,
  SplitSquareVertical,
  ScanText,
  FileType2,
  FolderArchive,
  Loader2,
  Layers,
  RefreshCw,
  PencilRuler,
  PenLine,
  ShieldCheck,
  Gauge,
  Eye,
  FileSpreadsheet,
  Presentation,
  FileText,
  Globe,
  Archive,
  Lock,
  Unlock,
  EyeOff,
  FormInput,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PdfWorkbench } from "@/components/PdfWorkbench";
import { PdfEditor } from "@/components/PdfEditor";
import { extractPdfText, rasterizePages } from "@/lib/pdf-preview";
import { ocrPages } from "@/lib/audit.functions";
import {
  compressPdf,
  fillFormFields,
  fileToPdf,
  normalizePdf,
  officeToPdf,
  pdfToDocx,
  pdfToPptx,
  pdfToXlsx,
  protectPdf,
  readFormFields,
  toPdfA,
  unlockPdf,
} from "@/lib/pdf-tools";

export const Route = createFileRoute("/_authenticated/app/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas de PDF — organizar, converter, editar e proteger | IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Junte, divida, converta (Word, Excel, PowerPoint, JPG), edite, assine, proteja com senha, comprima e aplique OCR em PDFs direto no navegador.",
      },
      { property: "og:title", content: "Ferramentas de PDF — IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Central completa de PDF: organizar, converter, editar, assinar, proteger, comprimir e OCR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tools,
});

type ToolId =
  | "merge" | "burst" | "extract" | "order" | "remove" | "rotate" | "wm" | "num"
  | "pdf2img" | "img2pdf" | "pdf2word" | "pdf2excel" | "pdf2ppt" | "office2pdf" | "pdfa"
  | "editor" | "forms"
  | "sign" | "request"
  | "protect" | "unlock" | "redact"
  | "compress"
  | "ocr" | "text" | "zip";

const CATS = [
  {
    id: "org",
    label: "Organizar",
    icon: Layers,
    tools: [
      { id: "merge", label: "Juntar PDFs" },
      { id: "burst", label: "Dividir em arquivos" },
      { id: "extract", label: "Extrair páginas" },
      { id: "order", label: "Reordenar páginas" },
      { id: "remove", label: "Excluir páginas" },
      { id: "rotate", label: "Girar páginas" },
      { id: "wm", label: "Marca d'água" },
      { id: "num", label: "Numerar páginas" },
    ],
  },
  {
    id: "conv",
    label: "Converter",
    icon: RefreshCw,
    tools: [
      { id: "pdf2word", label: "PDF → Word" },
      { id: "pdf2excel", label: "PDF → Excel" },
      { id: "pdf2ppt", label: "PDF → PowerPoint" },
      { id: "pdf2img", label: "PDF → JPG/PNG" },
      { id: "img2pdf", label: "JPG → PDF" },
      { id: "office2pdf", label: "Word/Excel/PPT/HTML → PDF" },
      { id: "pdfa", label: "PDF → PDF/A" },
    ],
  },
  {
    id: "edit",
    label: "Editar",
    icon: PencilRuler,
    tools: [
      { id: "editor", label: "Editor completo" },
      { id: "forms", label: "Preencher formulários" },
    ],
  },
  {
    id: "sig",
    label: "Assinatura",
    icon: PenLine,
    tools: [
      { id: "sign", label: "Assinar PDF" },
      { id: "request", label: "Solicitar assinaturas" },
    ],
  },
  {
    id: "sec",
    label: "Segurança",
    icon: ShieldCheck,
    tools: [
      { id: "protect", label: "Colocar senha" },
      { id: "unlock", label: "Remover senha" },
      { id: "redact", label: "Redigir dados" },
    ],
  },
  { id: "opt", label: "Otimizar", icon: Gauge, tools: [{ id: "compress", label: "Comprimir PDF" }] },
  {
    id: "ocr",
    label: "OCR",
    icon: Eye,
    tools: [
      { id: "ocr", label: "PDF pesquisável" },
      { id: "text", label: "Extrair texto" },
      { id: "zip", label: "Pasta ZIP" },
    ],
  },
] as const;

function parseRange(spec: string, total: number) {
  const idx = new Set<number>();
  for (const part of spec.split(",")) {
    const piece = part.trim();
    if (!piece) continue;
    const [a, b] = piece.split("-").map((n) => parseInt(n.trim(), 10));
    if (!a || Number.isNaN(a)) continue;
    const end = b && !Number.isNaN(b) ? b : a;
    for (let i = a; i <= end; i++) if (i >= 1 && i <= total) idx.add(i - 1);
  }
  return Array.from(idx).sort((x, y) => x - y);
}

async function loadPdf(file: File) {
  const normalized = await normalizePdf(new Uint8Array(await file.arrayBuffer()), file.name);
  const pdf = await PDFDocument.load(normalized, { ignoreEncryption: true });
  if (!pdf.getPageCount()) throw new Error("O PDF não possui páginas");
  return pdf;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function FileField({
  label,
  multiple,
  accept = ".pdf,application/pdf",
  onPick,
  files,
}: {
  label: string;
  multiple?: boolean;
  accept?: string;
  onPick: (files: File[]) => void;
  files: File[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length) onPick(picked);
          // libera o campo para permitir escolher o mesmo arquivo novamente
          e.target.value = "";
        }}
        className="file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-semibold"
      />

      {files.length > 0 && (
        <p className="truncate text-[11px] text-muted-foreground">
          {files.length} arquivo(s): {files.map((f) => f.name).join(", ")}
        </p>
      )}
    </div>
  );
}

function Tools() {
  const [cat, setCat] = useState<string>("org");
  const [tool, setTool] = useState<ToolId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState("1-2");
  const [removeSpec, setRemoveSpec] = useState("1");
  const [angle, setAngle] = useState("90");
  const [wmText, setWmText] = useState("CONFIDENCIAL");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<"leve" | "media" | "forte">("media");
  const [imgFormat, setImgFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [folderName, setFolderName] = useState("Documentos IDOC");
  const [fields, setFields] = useState<{ name: string; type: string; value: string }[] | null>(null);
  const [textResult, setTextResult] = useState<{ name: string; content: string } | null>(null);
  const [textFormat, setTextFormat] = useState<"txt" | "doc" | "pdf">("txt");
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string; format: "pdf" | "pdf-zip" } | null>(
    null,
  );

  const first = files[0];
  const activeCat = CATS.find((c) => c.id === cat)!;

  function pickTool(id: ToolId) {
    setTool(id);
    setFiles([]);
    setResult(null);
    setFields(null);
    setTextResult(null);
  }

  function open(bytes: Uint8Array, name: string, format: "pdf" | "pdf-zip" = "pdf") {
    setResult({ bytes, name, format });
  }

  async function run(fn: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    try {
      toast.success(await fn());
    } catch (e) {
      toast.error((e as Error).message || "Falha ao processar o arquivo");
    } finally {
      setBusy(false);
    }
  }

  function needPdf() {
    if (!first) throw new Error("Selecione um arquivo PDF");
    return first;
  }

  const actions: Record<string, () => Promise<string>> = {
    merge: async () => {
      if (files.length < 2) throw new Error("Selecione ao menos 2 arquivos");
      const out = await PDFDocument.create();
      for (const f of files) {
        let converted: Uint8Array;
        try {
          converted = await fileToPdf(f);
        } catch (error) {
          const detail = error instanceof Error ? error.message : "arquivo incompatível";
          throw new Error(`Não foi possível adicionar “${f.name}”: ${detail}`);
        }
        const src = await PDFDocument.load(converted, { ignoreEncryption: true });
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      }
      open(await out.save(), "idoc-unido");
      return `PDF unido com ${out.getPageCount()} páginas`;
    },
    burst: async () => {
      const src = await loadPdf(needPdf());
      const out = await PDFDocument.create();
      (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-dividido", "pdf-zip");
      return `${out.getPageCount()} página(s) prontas para dividir`;
    },
    extract: async () => {
      const src = await loadPdf(needPdf());
      const idx = parseRange(range, src.getPageCount());
      if (!idx.length) throw new Error("Intervalo inválido para este documento");
      const out = await PDFDocument.create();
      (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-paginas");
      return `${idx.length} página(s) extraída(s)`;
    },
    order: async () => {
      const src = await loadPdf(needPdf());
      const out = await PDFDocument.create();
      (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      open(await out.save(), needPdf().name.replace(/\.pdf$/i, "-organizado"));
      return "Arraste as páginas para reordenar e depois baixe";
    },
    remove: async () => {
      const src = await loadPdf(needPdf());
      const drop = new Set(parseRange(removeSpec, src.getPageCount()));
      if (!drop.size) throw new Error("Informe as páginas a remover");
      const keep = src.getPageIndices().filter((i) => !drop.has(i));
      if (!keep.length) throw new Error("Não é possível remover todas as páginas");
      const out = await PDFDocument.create();
      (await out.copyPages(src, keep)).forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-sem-paginas");
      return `${drop.size} página(s) removida(s)`;
    },
    rotate: async () => {
      const step = Number(angle);
      if (!Number.isFinite(step) || step % 90 !== 0) throw new Error("Use ângulos múltiplos de 90");
      const pdf = await loadPdf(needPdf());
      pdf.getPages().forEach((p) =>
        p.setRotation(degrees((((p.getRotation().angle + step) % 360) + 360) % 360)),
      );
      open(await pdf.save(), "idoc-rotacionado");
      return "Páginas rotacionadas";
    },
    wm: async () => {
      if (!wmText.trim()) throw new Error("Informe o texto da marca d'água");
      const pdf = await loadPdf(needPdf());
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const label = wmText.trim();
      for (const p of pdf.getPages()) {
        const { width, height } = p.getSize();
        let size = Math.max(18, Math.min(64, (width * 1.1) / Math.max(6, label.length)));
        while (font.widthOfTextAtSize(label, size) * 0.82 > width * 0.86 && size > 10) size -= 1;
        const w = font.widthOfTextAtSize(label, size);
        p.drawText(label, {
          x: Math.max(12, (width - w * 0.819) / 2),
          y: Math.max(12, (height - w * 0.574) / 2),
          size,
          font,
          color: rgb(0.45, 0.5, 0.58),
          opacity: 0.18,
          rotate: degrees(35),
        });
      }
      open(await pdf.save(), "idoc-marca-dagua");
      return "Marca d'água aplicada";
    },
    num: async () => {
      const pdf = await loadPdf(needPdf());
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pages = pdf.getPages();
      pages.forEach((p, i) => {
        const label = `${i + 1} / ${pages.length}`;
        p.drawText(label, {
          x: p.getSize().width - font.widthOfTextAtSize(label, 9) - 28,
          y: 18,
          size: 9,
          font,
          color: rgb(0.4, 0.45, 0.53),
        });
      });
      open(await pdf.save(), "idoc-numerado");
      return `${pages.length} página(s) numerada(s)`;
    },
    img2pdf: async () => {
      if (!files.length) throw new Error("Selecione imagens JPG ou PNG");
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const isPng = f.type.includes("png") || f.name.toLowerCase().endsWith(".png");
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const maxW = 595.28;
        const maxH = 841.89;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const page = out.addPage([maxW, maxH]);
        page.drawImage(img, {
          x: (maxW - img.width * scale) / 2,
          y: (maxH - img.height * scale) / 2,
          width: img.width * scale,
          height: img.height * scale,
        });
      }
      open(await out.save(), "idoc-imagens");
      return `PDF criado com ${files.length} imagem(ns)`;
    },
    pdf2img: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const rasters = await rasterizePages(bytes, src.getPageIndices(), imgFormat, 2);
      const ext = imgFormat === "image/png" ? "png" : "jpg";
      const base = f.name.replace(/\.pdf$/i, "");
      if (rasters.length === 1) {
        downloadBlob(rasters[0]!.blob, `${base}.${ext}`);
      } else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        const dir = zip.folder(base)!;
        for (const r of rasters) dir.file(`${base}-${String(r.index + 1).padStart(3, "0")}.${ext}`, r.blob);
        downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}-${ext}.zip`);
      }
      return `${rasters.length} imagem(ns) gerada(s)`;
    },
    pdf2word: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToDocx(bytes), `${f.name.replace(/\.pdf$/i, "")}.doc`);
      return "Documento do Word gerado";
    },
    pdf2excel: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToXlsx(bytes), `${f.name.replace(/\.pdf$/i, "")}.xlsx`);
      return "Planilha do Excel gerada";
    },
    pdf2ppt: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToPptx(bytes), `${f.name.replace(/\.pdf$/i, "")}.pptx`);
      return "Apresentação gerada";
    },
    office2pdf: async () => {
      if (!first) throw new Error("Selecione um arquivo Word, Excel, PowerPoint, HTML ou TXT");
      open(await officeToPdf(first), first.name.replace(/\.[^.]+$/, ""));
      return "Arquivo convertido em PDF";
    },
    pdfa: async () => {
      const f = needPdf();
      open(await toPdfA(new Uint8Array(await f.arrayBuffer())), f.name.replace(/\.pdf$/i, "-pdfa"));
      return "PDF/A gerado para arquivamento";
    },
    forms: async () => {
      const f = needPdf();
      const list = await readFormFields(new Uint8Array(await f.arrayBuffer()));
      if (!list.length) throw new Error("Este PDF não tem campos de formulário — use o editor completo");
      setFields(list);
      return `${list.length} campo(s) encontrado(s)`;
    },
    protect: async () => {
      const f = needPdf();
      if (password.trim().length < 4) throw new Error("Use uma senha com pelo menos 4 caracteres");
      const bytes = await protectPdf(new Uint8Array(await f.arrayBuffer()), password.trim());
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${f.name.replace(/\.pdf$/i, "")}-protegido.pdf`);
      return "PDF protegido com senha e baixado";
    },
    unlock: async () => {
      const f = needPdf();
      if (!password.trim()) throw new Error("Informe a senha atual do PDF");
      open(await unlockPdf(new Uint8Array(await f.arrayBuffer()), password.trim()), f.name.replace(/\.pdf$/i, "-liberado"));
      return "Proteção removida";
    },
    compress: async () => {
      const f = needPdf();
      const bytes = await compressPdf(new Uint8Array(await f.arrayBuffer()), level);
      const before = f.size / 1024 / 1024;
      const after = bytes.byteLength / 1024 / 1024;
      open(bytes, f.name.replace(/\.pdf$/i, "-comprimido"));
      return `De ${before.toFixed(1)} MB para ${after.toFixed(1)} MB`;
    },
    ocr: async () => {
      const f = needPdf();
      const bytes = new Uint8Array(await f.arrayBuffer());
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      if (src.getPageCount() > 30) throw new Error("Limite de 30 páginas por vez para o OCR");
      const rasters = await rasterizePages(bytes, src.getPageIndices(), "image/jpeg", 2);
      const images = await Promise.all(rasters.map((r) => blobToDataUrl(r.blob)));
      const { texts } = await ocrPages({ data: { images } });
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < rasters.length; i++) {
        const jpg = await out.embedJpg(new Uint8Array(await rasters[i]!.blob.arrayBuffer()));
        const page = out.addPage([jpg.width / 2, jpg.height / 2]);
        page.drawImage(jpg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
        let x = 4;
        let y = page.getHeight() - 12;
        for (const word of (texts[i] ?? "").split(/\s+/).filter(Boolean)) {
          const w = font.widthOfTextAtSize(word, 8) + 3;
          if (x + w > page.getWidth() - 4) {
            x = 4;
            y -= 10;
          }
          if (y < 6) break;
          page.drawText(word, { x, y, size: 8, font, opacity: 0, color: rgb(0, 0, 0) });
          x += w;
        }
      }
      open(await out.save(), "idoc-pesquisavel");
      return `PDF pesquisável com ${rasters.length} página(s)`;
    },
    text: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      let pages = await extractPdfText(bytes);
      if (pages.join("").trim().length < 20) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const rasters = await rasterizePages(bytes, src.getPageIndices().slice(0, 20), "image/jpeg", 2);
        const images = await Promise.all(rasters.map((r) => blobToDataUrl(r.blob)));
        pages = (await ocrPages({ data: { images } })).texts;
      }
      setTextResult({
        name: f.name.replace(/\.pdf$/i, ""),
        content: pages.map((t, i) => `--- Página ${i + 1} ---\n${t}`).join("\n\n"),
      });
      return "Texto extraído — revise antes de baixar";
    },
    zip: async () => {
      if (!files.length) throw new Error("Selecione os arquivos da pasta");
      const folder = folderName.trim() || "Documentos IDOC";
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const dir = zip.folder(folder)!;
      for (const f of files) dir.file(f.name, await f.arrayBuffer());
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${folder}.zip`);
      return `Pasta "${folder}" criada com ${files.length} arquivo(s)`;
    },
  };

  async function submitFields(flatten: boolean) {
    if (!first || !fields) return;
    await run(async () => {
      const values = Object.fromEntries(fields.map((f) => [f.name, f.value]));
      open(
        await fillFormFields(new Uint8Array(await first.arrayBuffer()), values, flatten),
        first.name.replace(/\.pdf$/i, "-preenchido"),
      );
      return "Formulário preenchido";
    });
  }

  async function downloadText() {
    if (!textResult) return;
    const base = textResult.name.trim() || "idoc-texto";
    if (textFormat === "txt") {
      downloadBlob(new Blob([textResult.content], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
      return;
    }
    if (textFormat === "doc") {
      const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;white-space:pre-wrap">${textResult.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</div></body></html>`;
      downloadBlob(new Blob([html], { type: "application/msword" }), `${base}.doc`);
      return;
    }
    const { textToPdf } = await import("@/lib/pdf-tools");
    const bytes = await textToPdf(textResult.content.split("\n"));
    downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${base}.pdf`);
  }

  const accept =
    tool === "merge"
      ? "*/*"
      : tool === "img2pdf"
      ? "image/jpeg,image/png"
      : tool === "office2pdf"
        ? ".docx,.xlsx,.xls,.csv,.pptx,.html,.htm,.txt"
        : tool === "zip"
          ? "*/*"
          : ".pdf,application/pdf";

  const ICONS: Partial<Record<ToolId, typeof Combine>> = {
    merge: Combine,
    burst: SplitSquareVertical,
    extract: Scissors,
    order: Layers,
    remove: Trash2,
    rotate: RotateCw,
    wm: Droplets,
    num: Hash,
    pdf2img: Images,
    img2pdf: Images,
    pdf2word: FileText,
    pdf2excel: FileSpreadsheet,
    pdf2ppt: Presentation,
    office2pdf: Globe,
    pdfa: Archive,
    editor: PencilRuler,
    forms: FormInput,
    sign: PenLine,
    protect: Lock,
    unlock: Unlock,
    redact: EyeOff,
    compress: Gauge,
    ocr: ScanText,
    text: FileType2,
    zip: FolderArchive,
  };
  const ToolIcon = ICONS[tool] ?? Wrench;
  const label = activeCat.tools.find((t) => t.id === tool)?.label ?? "Executar";

  return (
    <AppShell title="Ferramentas de PDF">
      <div className="space-y-3">
        <div className="card-soft p-4">
          <div className="mb-3 flex items-start gap-2">
            <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Tudo é processado no seu dispositivo — os arquivos não são enviados ao servidor (exceto o
              reconhecimento de texto). Você visualiza, escolhe as páginas, o nome e o formato antes de baixar.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCat(c.id);
                  pickTool(c.tools[0]!.id as ToolId);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold ${
                  cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <c.icon className="size-4" />
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {activeCat.tools.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTool(t.id as ToolId)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                  tool === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {tool === "request" ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Para coletar assinaturas de outras pessoas, envie o documento dentro da empresa: você define
                  signatários, posiciona os campos de assinatura, inicial e texto, e envia o link seguro com
                  registro de evidências.
                </p>
                <Button asChild className="w-full">
                  <Link to="/app/empresas">
                    <PenLine className="mr-1 size-4" /> Ir para empresas e enviar
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <FileField
                  label={
                    tool === "merge"
                      ? "Arquivos para juntar (PDF, imagens ou documentos, na ordem escolhida)"
                      : tool === "img2pdf"
                        ? "Imagens JPG/PNG"
                        : tool === "office2pdf"
                          ? "Word, Excel, PowerPoint, HTML ou TXT"
                          : tool === "zip"
                            ? "Arquivos de qualquer formato"
                            : "Arquivo PDF"
                  }
                  multiple={tool === "merge" || tool === "img2pdf" || tool === "zip"}
                  accept={accept}
                  files={files}
                  onPick={(f) => {
                    setFiles(f);
                    setFields(null);
                    setResult(null);
                  }}
                />

                {tool === "extract" && (
                  <>
                    <Label htmlFor="rg">Páginas (ex.: 1-3,5)</Label>
                    <Input id="rg" value={range} onChange={(e) => setRange(e.target.value)} />
                  </>
                )}
                {tool === "remove" && (
                  <>
                    <Label htmlFor="rm">Páginas a excluir (ex.: 2,5-6)</Label>
                    <Input id="rm" value={removeSpec} onChange={(e) => setRemoveSpec(e.target.value)} />
                  </>
                )}
                {tool === "rotate" && (
                  <>
                    <Label htmlFor="an">Ângulo (múltiplo de 90)</Label>
                    <Input id="an" type="number" step="90" value={angle} onChange={(e) => setAngle(e.target.value)} />
                  </>
                )}
                {tool === "wm" && (
                  <>
                    <Label htmlFor="wt">Texto da marca d'água</Label>
                    <Input id="wt" value={wmText} onChange={(e) => setWmText(e.target.value)} />
                  </>
                )}
                {tool === "pdf2img" && (
                  <div className="flex gap-2">
                    {(["image/jpeg", "image/png"] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={imgFormat === f ? "default" : "outline"}
                        onClick={() => setImgFormat(f)}
                      >
                        {f === "image/jpeg" ? "JPG" : "PNG"}
                      </Button>
                    ))}
                  </div>
                )}
                {(tool === "protect" || tool === "unlock") && (
                  <>
                    <Label htmlFor="pw">{tool === "protect" ? "Nova senha" : "Senha atual do PDF"}</Label>
                    <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </>
                )}
                {tool === "compress" && (
                  <div className="flex gap-2">
                    {(["leve", "media", "forte"] as const).map((l) => (
                      <Button key={l} size="sm" variant={level === l ? "default" : "outline"} onClick={() => setLevel(l)}>
                        {l === "media" ? "Média" : l === "leve" ? "Leve" : "Forte"}
                      </Button>
                    ))}
                  </div>
                )}
                {tool === "zip" && (
                  <>
                    <Label htmlFor="fn">Nome da pasta</Label>
                    <Input id="fn" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
                  </>
                )}
                {(tool === "editor" || tool === "sign" || tool === "redact") && (
                  <p className="text-[11px] text-muted-foreground">
                    {tool === "sign"
                      ? "Use a ferramenta Desenhar para assinar à mão, ou Texto para digitar o nome. Depois aplique e baixe."
                      : tool === "redact"
                        ? "Use Forma/Destacar sobre os dados sensíveis com a cor escura e marque “Achatar” para tornar a tarja permanente."
                        : "Adicione textos, imagens, formas, destaques e anotações à mão em qualquer página."}
                  </p>
                )}

                {tool === "editor" || tool === "sign" || tool === "redact" ? (
                  first ? (
                    <PdfEditor
                      key={first.name + first.size + tool}
                      file={first}
                      flattenDefault={tool === "redact"}
                      onResult={(bytes, name) => open(bytes, name)}
                    />
                  ) : null
                ) : (
                  <Button className="w-full" disabled={busy} onClick={() => run(actions[tool]!)}>
                    {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ToolIcon className="mr-1 size-4" />}
                    {label}
                  </Button>
                )}

                {tool === "forms" && fields && (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    {fields.map((f, i) => (
                      <div key={f.name} className="space-y-1">
                        <Label htmlFor={`fl${i}`} className="text-[11px]">
                          {f.name}
                        </Label>
                        <Input
                          id={`fl${i}`}
                          value={f.value}
                          onChange={(e) =>
                            setFields((prev) =>
                              (prev ?? []).map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                            )
                          }
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => submitFields(false)}>
                        Salvar editável
                      </Button>
                      <Button size="sm" disabled={busy} onClick={() => submitFields(true)}>
                        Salvar finalizado
                      </Button>
                    </div>
                  </div>
                )}

                {tool === "text" && textResult && (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <Label htmlFor="tn">Nome do arquivo</Label>
                    <Input
                      id="tn"
                      value={textResult.name}
                      onChange={(e) => setTextResult({ ...textResult, name: e.target.value })}
                    />
                    <Label htmlFor="tc">Conteúdo (edite antes de baixar)</Label>
                    <Textarea
                      id="tc"
                      rows={10}
                      value={textResult.content}
                      onChange={(e) => setTextResult({ ...textResult, content: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-2">
                      {(["txt", "doc", "pdf"] as const).map((f) => (
                        <Button
                          key={f}
                          size="sm"
                          variant={textFormat === f ? "default" : "outline"}
                          onClick={() => setTextFormat(f)}
                        >
                          {f.toUpperCase()}
                        </Button>
                      ))}
                      <Button size="sm" className="ml-auto" onClick={downloadText}>
                        <Download className="mr-1 size-3.5" /> Baixar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {result && (
            <PdfWorkbench
              key={result.name + result.bytes.byteLength}
              bytes={result.bytes}
              defaultName={result.name}
              defaultFormat={result.format}
              onClose={() => setResult(null)}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
}
