import { Link } from "@tanstack/react-router";
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
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PdfWorkbench } from "@/components/PdfWorkbench";
import { PdfEditor } from "@/components/PdfEditor";
import { SelfSignPdf } from "@/components/SelfSignPdf";
import { extractPdfText, rasterizePages } from "@/lib/pdf-preview";
import { ocrPages } from "@/lib/audit.functions";
import {
  compressPdf,
  enhanceScannedDocument,
  fillFormFields,
  findMergedVisualRegressions,
  normalizePdf,
  officeToPdf,
  pdfToDocx,
  pdfToPptx,
  pdfToXlsx,
  prepareFileForMerge,
  protectPdf,
  rasterizePdfForMerge,
  readFormFields,
  toPdfA,
  unlockPdf,
  type DocumentTreatmentLevel,
  type DocumentTreatmentProgress,
  type OfficeConversionMode,
} from "@/lib/pdf-tools";

type ToolId =
  | "merge" | "burst" | "extract" | "order" | "remove" | "rotate" | "wm" | "num"
  | "pdf2img" | "img2pdf" | "pdf2word" | "pdf2excel" | "pdf2ppt" | "office2pdf" | "pdfa"
  | "editor" | "forms"
  | "sign" | "request"
  | "protect" | "unlock" | "redact"
  | "compress" | "enhance"
  | "ocr" | "text" | "zip";

type MergeFileStatus = {
  state: "waiting" | "processing" | "ready" | "recovered" | "error";
  pages?: number;
  message?: string;
};

const CATS = [
  {
    id: "org",
    label: "Organizar",
    icon: Layers,
    iconClass: "bg-tool-organize",
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
    iconClass: "bg-tool-convert",
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
    iconClass: "bg-tool-edit",
    tools: [
      { id: "editor", label: "Editor completo" },
      { id: "forms", label: "Preencher formulários" },
    ],
  },
  {
    id: "sig",
    label: "Assinatura",
    icon: PenLine,
    iconClass: "bg-tool-sign",
    tools: [
      { id: "sign", label: "Assinar PDF" },
      { id: "request", label: "Solicitar assinaturas" },
    ],
  },
  {
    id: "sec",
    label: "Segurança",
    icon: ShieldCheck,
    iconClass: "bg-tool-security",
    tools: [
      { id: "protect", label: "Colocar senha" },
      { id: "unlock", label: "Remover senha" },
      { id: "redact", label: "Redigir dados" },
    ],
  },
  { id: "opt", label: "Otimização", icon: Gauge, iconClass: "bg-tool-optimize", tools: [{ id: "compress", label: "Comprimir PDF" }, { id: "enhance", label: "Tratar documento" }] },
  {
    id: "ocr",
    label: "OCR",
    icon: ScanText,
    iconClass: "bg-tool-ocr",
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
  append,
  accept = ".pdf,application/pdf",
  onPick,
  onRemove,
  onClear,
  files,
  statuses,
}: {
  label: string;
  multiple?: boolean;
  append?: boolean;
  accept?: string;
  onPick: (files: File[]) => void;
  onRemove?: (index: number) => void;
  onClear?: () => void;
  files: File[];
  statuses?: MergeFileStatus[] | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
        <Input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) onPick(picked);
            // libera o campo para adicionar outro lote, inclusive de outra pasta
            e.target.value = "";
          }}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-semibold"
        />
        {append && files.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Selecione novamente para adicionar mais arquivos de outra pasta ou da galeria.
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{files.length} arquivo(s) na fila</p>
            {onClear && (
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onClear}>
                Limpar todos
              </Button>
            )}
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
                <span className="w-5 shrink-0 text-center text-[11px] text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                {statuses?.[index] && (
                  <span className={`shrink-0 text-[10px] font-medium ${
                    statuses[index]?.state === "error"
                      ? "text-destructive"
                      : statuses[index]?.state === "recovered"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}>
                    {statuses[index]?.state === "processing"
                      ? "Analisando…"
                      : statuses[index]?.state === "ready"
                        ? `${statuses[index]?.pages ?? 0} pág.`
                        : statuses[index]?.state === "recovered"
                          ? `${statuses[index]?.pages ?? 0} pág. recuperada(s)`
                          : statuses[index]?.state === "error"
                            ? "Problema"
                            : "Aguardando"}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {file.size < 1_048_576 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1_048_576).toFixed(1)} MB`}
                </span>
                {onRemove && (
                  <Button type="button" size="icon" variant="ghost" className="size-7" aria-label={`Remover ${file.name}`} onClick={() => onRemove(index)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PdfTools({ initialTool: requestedTool, isAuthenticated = false }: { initialTool?: string; isAuthenticated?: boolean }) {
  const initialCategory = CATS.find((category) => category.tools.some((item) => item.id === requestedTool));
  const initialTool = initialCategory?.tools.find((item) => item.id === requestedTool)?.id as ToolId | undefined;
  const [cat, setCat] = useState<string>(initialCategory?.id ?? "org");
  const [tool, setTool] = useState<ToolId>(initialTool ?? "merge");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState("1-2");
  const [removeSpec, setRemoveSpec] = useState("1");
  const [angle, setAngle] = useState("90");
  const [wmText, setWmText] = useState("CONFIDENCIAL");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<"leve" | "media" | "forte">("media");
  const [treatmentLevel, setTreatmentLevel] = useState<DocumentTreatmentLevel>("equilibrado");
  const [treatmentProgress, setTreatmentProgress] = useState<DocumentTreatmentProgress | null>(null);
  const [imgFormat, setImgFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [conversionMode, setConversionMode] = useState<OfficeConversionMode>("editable");
  const [folderName, setFolderName] = useState("Documentos IDOC");
  const [fields, setFields] = useState<{ name: string; type: string; value: string }[] | null>(null);
  const [textResult, setTextResult] = useState<{ name: string; content: string } | null>(null);
  const [textFormat, setTextFormat] = useState<"txt" | "doc" | "pdf">("txt");
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string; format: "pdf" | "pdf-zip" } | null>(
    null,
  );
  const [mergeStatuses, setMergeStatuses] = useState<MergeFileStatus[]>([]);

  const first = files[0];
  const activeCat = CATS.find((c) => c.id === cat) ?? CATS[0];

  function pickTool(id: ToolId) {
    setTool(id);
    setFiles([]);
    setResult(null);
    setFields(null);
    setTextResult(null);
    setMergeStatuses([]);
    setTreatmentProgress(null);
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
      setMergeStatuses(files.map(() => ({ state: "waiting" })));
      let recoveredCount = 0;
      const preparedFiles: Awaited<ReturnType<typeof prepareFileForMerge>>[] = [];
      for (const [index, f] of files.entries()) {
        setMergeStatuses((current) => current.map((status, itemIndex) =>
          itemIndex === index ? { state: "processing" } : status,
        ));
        try {
          const prepared = await prepareFileForMerge(f);
          preparedFiles.push(prepared);
          if (prepared.recovered) recoveredCount += 1;
          setMergeStatuses((current) => current.map((status, itemIndex) =>
            itemIndex === index
              ? { state: prepared.recovered ? "recovered" : "ready", pages: prepared.pageCount }
              : status,
          ));
        } catch (error) {
          const detail = error instanceof Error ? error.message : "arquivo incompatível";
          setMergeStatuses((current) => current.map((status, itemIndex) =>
            itemIndex === index ? { state: "error", message: detail } : status,
          ));
          throw new Error(`Não foi possível adicionar “${f.name}”: ${detail}`);
        }
      }

      async function buildMerged(items: typeof preparedFiles) {
        const output = await PDFDocument.create();
        for (const item of items) {
          const source = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
          const copied = await output.copyPages(source, source.getPageIndices());
          copied.forEach((page) => output.addPage(page));
        }
        return { output, bytes: await output.save({ useObjectStreams: false }) };
      }

      let merged = await buildMerged(preparedFiles);
      const expected = preparedFiles.flatMap((item) => item.visuals);
      const regressions = await findMergedVisualRegressions(merged.bytes, expected);
      if (regressions.length) {
        let pageOffset = 0;
        for (let index = 0; index < preparedFiles.length; index++) {
          const item = preparedFiles[index];
          if (!item) continue;
          const end = pageOffset + item.pageCount;
          const affected = regressions.some((pageIndex) => pageIndex >= pageOffset && pageIndex < end);
          if (affected && !item.recovered) {
            preparedFiles[index] = await rasterizePdfForMerge(item.bytes);
            recoveredCount += 1;
            setMergeStatuses((current) => current.map((status, itemIndex) =>
              itemIndex === index ? { state: "recovered", pages: item.pageCount } : status,
            ));
          }
          pageOffset = end;
        }
        merged = await buildMerged(preparedFiles);
        const finalRegressions = await findMergedVisualRegressions(
          merged.bytes,
          preparedFiles.flatMap((item) => item.visuals),
        );
        if (finalRegressions.length) {
          throw new Error(`A união foi interrompida porque ${finalRegressions.length} página(s) perderiam conteúdo visual`);
        }
      }
      open(merged.bytes, "idoc-unido");
      return `PDF unido com ${merged.output.getPageCount()} páginas${recoveredCount ? `; ${recoveredCount} arquivo(s) recuperado(s)` : ""}`;
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
        downloadBlob(rasters[0]?.blob ?? new Blob(), `${base}.${ext}`);
      } else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        const dir = zip.folder(base);
         if (!dir) throw new Error("Não foi possível criar a pasta compactada");
        for (const r of rasters) dir.file(`${base}-${String(r.index + 1).padStart(3, "0")}.${ext}`, r.blob);
        downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}-${ext}.zip`);
      }
      return `${rasters.length} imagem(ns) gerada(s)`;
    },
    pdf2word: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToDocx(bytes, conversionMode), `${f.name.replace(/\.pdf$/i, "")}.docx`);
      return conversionMode === "editable" ? "Word com textos reais e conteúdo editável gerado" : "Word fiel ao PDF gerado";
    },
    pdf2excel: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToXlsx(bytes, conversionMode), `${f.name.replace(/\.pdf$/i, "")}.xlsx`);
      return conversionMode === "editable" ? "Excel com textos reais e conteúdo editável gerado" : "Excel fiel ao PDF gerado";
    },
    pdf2ppt: async () => {
      const f = needPdf();
      const bytes = await normalizePdf(new Uint8Array(await f.arrayBuffer()), f.name);
      downloadBlob(await pdfToPptx(bytes, conversionMode), `${f.name.replace(/\.pdf$/i, "")}.pptx`);
      return conversionMode === "editable" ? "PowerPoint com textos reais e conteúdo editável gerado" : "PowerPoint fiel ao PDF gerado";
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
      setFields(list);
      return list.length
        ? `${list.length} campo(s) encontrado(s)`
        : "Sem campos nativos — clique na folha para preencher";
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
    enhance: async () => {
      if (!first) throw new Error("Selecione um PDF ou uma imagem digitalizada");
      setTreatmentProgress({ current: 0, total: 0, stage: "preparing" });
      try {
        const bytes = await enhanceScannedDocument(first, treatmentLevel, setTreatmentProgress);
        open(bytes, first.name.replace(/\.[^.]+$/i, "-tratado"));
        return "Documento tratado — confira todas as páginas antes de baixar";
      } finally {
        setTreatmentProgress(null);
      }
    },
    ocr: async () => {
      if (!isAuthenticated) throw new Error("Entre na sua conta para usar o reconhecimento de texto online");
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
        const raster = rasters[i];
        if (!raster) continue;
        const jpg = await out.embedJpg(new Uint8Array(await raster.blob.arrayBuffer()));
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
        if (!isAuthenticated) {
          throw new Error("Este PDF é digitalizado. Entre na sua conta para reconhecer o texto por OCR");
        }
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
      const dir = zip.folder(folder);
       if (!dir) throw new Error("Não foi possível criar a pasta compactada");
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
          : tool === "enhance"
            ? ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
    enhance: ScanLine,
    ocr: ScanText,
    text: FileType2,
    zip: FolderArchive,
  };
  const ToolIcon = ICONS[tool] ?? Wrench;
  const label = activeCat.tools.find((t) => t.id === tool)?.label ?? "Executar";

  return (
    <div className="space-y-3">
        <div className="card-soft p-4">
          <div className="mb-3 flex items-start gap-2">
            <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              {isAuthenticated
                ? "Seus arquivos são processados no dispositivo e só são salvos quando você escolhe uma área da conta. O reconhecimento de texto usa processamento seguro online."
                : "Uso livre, sem cadastro e sem armazenamento: os arquivos permanecem no seu dispositivo. O reconhecimento de texto online exige uma conta."}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7 sm:gap-3">
            {CATS.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  setCat(c.id);
                  pickTool(c.tools[0]?.id as ToolId);
                }}
                aria-pressed={cat === c.id}
                className={`group h-auto min-w-0 flex-col gap-2 whitespace-normal rounded-lg px-1 py-1.5 text-center text-[10px] font-bold [&_svg]:size-8 sm:text-xs sm:[&_svg]:size-10 ${
                  cat === c.id ? "bg-secondary text-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" : "text-foreground hover:bg-secondary"
                }`}
              >
                <span className={`flex aspect-square w-full max-w-16 items-center justify-center rounded-lg text-primary-foreground shadow-soft transition-transform group-hover:-translate-y-0.5 sm:max-w-20 ${c.iconClass}`}>
                  <c.icon className="size-8 stroke-[2.4] sm:size-10" aria-hidden="true" />
                </span>
                <span className="min-h-7 leading-tight">{c.label}</span>
              </Button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {activeCat.tools.map((t) => (
              (() => {
                const Icon = ICONS[t.id as ToolId] ?? Wrench;
                return (
                  <Button
                    key={t.id}
                    type="button"
                    variant="outline"
                    onClick={() => pickTool(t.id as ToolId)}
                    className={`h-auto min-h-11 justify-start gap-2 whitespace-normal px-3 py-2 text-left text-[11px] leading-tight ${
                      tool === t.id ? "border-primary bg-primary/10 text-primary shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground ${activeCat.iconClass}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>{t.label}</span>
                  </Button>
                );
              })()
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
                  {isAuthenticated ? (
                    <Link to="/app/empresas"><PenLine className="mr-1 size-4" /> Ir para empresas e enviar</Link>
                  ) : (
                    <Link to="/auth" search={{ next: "/app/empresas" }}><PenLine className="mr-1 size-4" /> Entrar para solicitar assinaturas</Link>
                  )}
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
                            : tool === "enhance"
                              ? "Documento digitalizado (PDF, JPG, PNG ou WEBP)"
                              : "Arquivo PDF"
                  }
                  multiple={tool === "merge" || tool === "img2pdf" || tool === "zip"}
                  append={tool === "merge"}
                  accept={accept}
                  files={files}
                    {...(tool === "merge" ? { statuses: mergeStatuses } : {})}
                  onPick={(f) => {
                     setFiles((current) => tool === "merge" ? [...current, ...f] : f);
                     setMergeStatuses((current) => tool === "merge"
                       ? [...current, ...f.map(() => ({ state: "waiting" as const }))]
                       : []);
                    setFields(null);
                    setResult(null);
                  }}
                  {...(tool === "merge" ? {
                    onRemove: (index: number) => {
                      setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
                       setMergeStatuses((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      setResult(null);
                    },
                    onClear: () => {
                      setFiles([]);
                       setMergeStatuses([]);
                      setResult(null);
                    },
                  } : {})}
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
                {(tool === "pdf2word" || tool === "pdf2excel" || tool === "pdf2ppt") && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2" aria-label="Tipo de conversão">
                      <Button type="button" size="sm" variant={conversionMode === "editable" ? "default" : "outline"} onClick={() => setConversionMode("editable")}>
                        Conteúdo editável
                      </Button>
                      <Button type="button" size="sm" variant={conversionMode === "faithful" ? "default" : "outline"} onClick={() => setConversionMode("faithful")}>
                        Visual idêntico
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      {conversionMode === "editable"
                        ? "Conteúdo editável: remove o texto da imagem de fundo e o recria como texto real, selecionável e editável, preservando posições, cores e a fonte declarada quando disponível. Fotos, ilustrações e fundos permanecem como elementos visuais. PDFs digitalizados precisam primeiro do OCR."
                        : "Visual idêntico: preserva exatamente textos, imagens, tabelas, fontes, posições e proporções como uma imagem integral por página. É a opção mais fiel, mas o conteúdo interno não fica separado para edição."}
                    </div>
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
                {tool === "enhance" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(["conservador", "equilibrado", "intenso"] as const).map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={treatmentLevel === option ? "default" : "outline"}
                          onClick={() => setTreatmentLevel(option)}
                          className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs capitalize"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      Limpa fundo, sombras e manchas leves, recupera contraste e reforça bordas de letras, números e códigos de barras. O conteúdo não é recriado nem alterado e o arquivo original permanece intacto.
                    </div>
                    {treatmentProgress && (
                      <div className="space-y-2" role="status" aria-live="polite">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>
                            {treatmentProgress.stage === "preparing"
                              ? "Preparando documento…"
                              : treatmentProgress.stage === "building"
                                ? "Montando o novo PDF…"
                                : `Tratando página ${treatmentProgress.current} de ${treatmentProgress.total}`}
                          </span>
                          {treatmentProgress.total > 0 && <span>{Math.round((treatmentProgress.current / treatmentProgress.total) * 100)}%</span>}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-tool-optimize transition-all"
                            style={{ width: `${treatmentProgress.total ? (treatmentProgress.current / treatmentProgress.total) * 100 : 8}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Informação totalmente apagada, cortada ou fora de foco não pode ser recuperada. Confira a prévia antes de baixar.
                    </p>
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
                       ? "Escolha o modo de assinatura, posicione na página e gere um PDF final com relatório de evidências."
                      : tool === "redact"
                        ? "Use Forma/Destacar sobre os dados sensíveis com a cor escura e marque “Achatar” para tornar a tarja permanente."
                        : "Adicione textos, imagens, formas, destaques e anotações à mão em qualquer página."}
                  </p>
                )}

                {tool === "sign" ? (
                  first ? (
                    <SelfSignPdf
                      key={first.name + first.size + "self-sign"}
                      file={first}
                      isAuthenticated={isAuthenticated}
                      onResult={(bytes, name) => open(bytes, name)}
                    />
                  ) : null
                ) : tool === "editor" || tool === "redact" ? (
                  first ? (
                    <PdfEditor
                      key={first.name + first.size + tool}
                      file={first}
                      flattenDefault={tool === "redact"}
                      onResult={(bytes, name) => open(bytes, name)}
                    />
                  ) : null
                ) : (
                  <Button className="w-full" disabled={busy} onClick={() => actions[tool] ? run(actions[tool]) : undefined}>
                    {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ToolIcon className="mr-1 size-4" />}
                    {label}
                  </Button>
                )}

                {tool === "forms" && fields && fields.length === 0 && first && (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      Este PDF não tem campos nativos. Clique sobre a linha em branco na folha e digite o conteúdo.
                    </p>
                    <PdfEditor
                      key={first.name + first.size + "forms"}
                      file={first}
                      suffix="-preenchido"
                      onResult={(bytes, name) => open(bytes, name)}
                    />
                  </>
                )}

                {tool === "forms" && fields && fields.length > 0 && (
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
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
}
