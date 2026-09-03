import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PdfWorkbench } from "@/components/PdfWorkbench";
import { extractPdfText, rasterizePages } from "@/lib/pdf-preview";
import { ocrPages } from "@/lib/audit.functions";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas PDF — IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Una, divida, rotacione, numere e marque PDFs direto no navegador, sem enviar arquivos ao servidor.",
      },
      { property: "og:title", content: "Ferramentas PDF — IDOC BUSINESS" },
      { property: "og:description", content: "Editor de PDF local do IDOC BUSINESS." },
    ],
  }),
  component: Tools,
});


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
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  if (!pdf.getPageCount()) throw new Error("O PDF não possui páginas");
  return pdf;
}

function FileField({
  id,
  label,
  inputRef,
  multiple,
  accept = ".pdf,application/pdf",
  onPick,
}: {
  id: string;
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  multiple?: boolean;
  accept?: string;
  onPick?: (files: File[]) => void;
}) {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setNames(files.map((f) => f.name));
          onPick?.(files);
        }}
        className="file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-semibold"
      />
      {names.length > 0 && (
        <p className="truncate text-[11px] text-muted-foreground">
          {names.length} arquivo(s): {names.join(", ")}
        </p>
      )}
    </div>
  );
}

function Tools() {
  const mergeRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLInputElement>(null);
  const burstRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLInputElement>(null);
  const rotRef = useRef<HTMLInputElement>(null);
  const wmRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const ocrRef = useRef<HTMLInputElement>(null);
  const txtRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState("1-2");
  const [removeSpec, setRemoveSpec] = useState("1");
  const [angle, setAngle] = useState("90");
  const [text, setText] = useState("CONFIDENCIAL");
  const [busy, setBusy] = useState(false);
  const [pageInfo, setPageInfo] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string; format: "pdf" | "pdf-zip" } | null>(
    null,
  );
  const [textResult, setTextResult] = useState<{ name: string; content: string } | null>(null);
  const [textFormat, setTextFormat] = useState<"txt" | "doc" | "pdf">("txt");
  const [folderName, setFolderName] = useState("Documentos IDOC");
  const [zipFiles, setZipFiles] = useState<File[]>([]);

  function open(bytes: Uint8Array, name: string, format: "pdf" | "pdf-zip" = "pdf") {
    setResult({ bytes, name, format });
  }

  async function run(fn: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    try {
      const msg = await fn();
      toast.success(`${msg} — revise e escolha o formato antes de baixar`);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao processar o PDF");
    } finally {
      setBusy(false);
    }
  }

  const merge = () =>
    run(async () => {
      const files = Array.from(mergeRef.current?.files ?? []);
      if (files.length < 2) throw new Error("Selecione ao menos 2 PDFs");
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await loadPdf(f);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      open(await out.save(), "idoc-unido");
      return `PDF unido com ${out.getPageCount()} páginas`;
    });

  const extract = () =>
    run(async () => {
      const f = splitRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const src = await loadPdf(f);
      const idx = parseRange(range, src.getPageCount());
      if (!idx.length) throw new Error("Intervalo inválido para este documento");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, idx);
      pages.forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-paginas");
      return `${idx.length} página(s) extraída(s)`;
    });

  const burst = () =>
    run(async () => {
      const f = burstRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const src = await loadPdf(f);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-dividido", "pdf-zip");
      return `${out.getPageCount()} página(s) prontas para dividir`;
    });

  const removePages = () =>
    run(async () => {
      const f = removeRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const src = await loadPdf(f);
      const drop = new Set(parseRange(removeSpec, src.getPageCount()));
      if (!drop.size) throw new Error("Informe as páginas a remover");
      const keep = src.getPageIndices().filter((i) => !drop.has(i));
      if (!keep.length) throw new Error("Não é possível remover todas as páginas");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, keep);
      pages.forEach((p) => out.addPage(p));
      open(await out.save(), "idoc-sem-paginas");
      return `${drop.size} página(s) removida(s)`;
    });

  const rotate = () =>
    run(async () => {
      const f = rotRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const step = Number(angle);
      if (!Number.isFinite(step) || step % 90 !== 0) throw new Error("Use ângulos múltiplos de 90");
      const pdf = await loadPdf(f);
      pdf.getPages().forEach((p) =>
        p.setRotation(degrees(((p.getRotation().angle + step) % 360 + 360) % 360)),
      );
      open(await pdf.save(), "idoc-rotacionado");
      return "Páginas rotacionadas";
    });

  const watermark = () =>
    run(async () => {
      const f = wmRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      if (!text.trim()) throw new Error("Informe o texto da marca d'água");
      const pdf = await loadPdf(f);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const label = text.trim();
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
    });

  const numberPages = () =>
    run(async () => {
      const f = numRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const pdf = await loadPdf(f);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pages = pdf.getPages();
      pages.forEach((p, i) => {
        const { width } = p.getSize();
        const label = `${i + 1} / ${pages.length}`;
        const size = 9;
        p.drawText(label, {
          x: width - font.widthOfTextAtSize(label, size) - 28,
          y: 18,
          size,
          font,
          color: rgb(0.4, 0.45, 0.53),
        });
      });
      open(await pdf.save(), "idoc-numerado");
      return `${pages.length} página(s) numerada(s)`;
    });

  const imagesToPdf = () =>
    run(async () => {
      const files = Array.from(imgRef.current?.files ?? []);
      if (!files.length) throw new Error("Selecione imagens JPG ou PNG");
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const isPng = f.type.includes("png") || f.name.toLowerCase().endsWith(".png");
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const maxW = 595.28;
        const maxH = 841.89;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const page = out.addPage([maxW, maxH]);
        page.drawImage(img, { x: (maxW - w) / 2, y: (maxH - h) / 2, width: w, height: h });
      }
      open(await out.save(), "idoc-imagens");
      return `PDF criado com ${files.length} imagem(ns)`;
    });

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** Gera PDF pesquisável: mantém a imagem da página e adiciona camada de texto invisível via OCR. */
  const searchable = () =>
    run(async () => {
      const f = ocrRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF digitalizado");
      const bytes = new Uint8Array(await f.arrayBuffer());
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = src.getPageCount();
      if (count > 30) throw new Error("Limite de 30 páginas por vez para o OCR");
      const rasters = await rasterizePages(bytes, src.getPageIndices(), "image/jpeg", 2);
      const images = await Promise.all(
        rasters.map(
          (r) =>
            new Promise<string>((resolve) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result));
              fr.readAsDataURL(r.blob);
            }),
        ),
      );
      const { texts } = await ocrPages({ data: { images } });
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < rasters.length; i++) {
        const jpg = await out.embedJpg(new Uint8Array(await rasters[i]!.blob.arrayBuffer()));
        const page = out.addPage([jpg.width / 2, jpg.height / 2]);
        page.drawImage(jpg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
        const words = (texts[i] ?? "").split(/\s+/).filter(Boolean);
        let x = 4;
        let y = page.getHeight() - 12;
        for (const word of words) {
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
      return `PDF pesquisável gerado com ${rasters.length} página(s)`;
    });

  /** Converte PDF em texto editável para baixar como TXT, Word ou PDF. */
  const toText = () =>
    run(async () => {
      const f = txtRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const bytes = new Uint8Array(await f.arrayBuffer());
      let pages = await extractPdfText(bytes);
      if (pages.join("").trim().length < 20) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const rasters = await rasterizePages(bytes, src.getPageIndices().slice(0, 20), "image/jpeg", 2);
        const images = await Promise.all(
          rasters.map(
            (r) =>
              new Promise<string>((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(String(fr.result));
                fr.readAsDataURL(r.blob);
              }),
          ),
        );
        pages = (await ocrPages({ data: { images } })).texts;
      }
      setTextResult({
        name: f.name.replace(/\.pdf$/i, ""),
        content: pages.map((t, i) => `--- Página ${i + 1} ---\n${t}`).join("\n\n"),
      });
      return "Texto extraído — revise antes de baixar";
    });

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
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const size = 11;
    const margin = 48;
    let page = pdf.addPage([595.28, 841.89]);
    let y = page.getHeight() - margin;
    const maxWidth = page.getWidth() - margin * 2;
    for (const paragraph of textResult.content.split("\n")) {
      let line = "";
      for (const word of paragraph.split(" ")) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > maxWidth) {
          page.drawText(line, { x: margin, y, size, font });
          y -= size * 1.45;
          line = word;
          if (y < margin) {
            page = pdf.addPage([595.28, 841.89]);
            y = page.getHeight() - margin;
          }
        } else line = test;
      }
      page.drawText(line, { x: margin, y, size, font });
      y -= size * 1.45;
      if (y < margin) {
        page = pdf.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
      }
    }
    downloadBlob(new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" }), `${base}.pdf`);
  }

  /** Cria uma pasta ZIP com todos os arquivos enviados. */
  const buildZip = () =>
    run(async () => {
      if (!zipFiles.length) throw new Error("Selecione os arquivos da pasta");
      const folder = folderName.trim() || "Documentos IDOC";
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const dir = zip.folder(folder)!;
      for (const f of zipFiles) dir.file(f.name, await f.arrayBuffer());
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${folder}.zip`);
      return `Pasta "${folder}" criada com ${zipFiles.length} arquivo(s)`;
    });

  async function inspect(files: File[]) {
    const f = files[0];
    if (!f) return setPageInfo(null);
    try {
      const pdf = await loadPdf(f);
      setPageInfo(`${f.name} — ${pdf.getPageCount()} página(s)`);
    } catch {
      setPageInfo("Não foi possível ler este PDF");
    }
  }

  return (
    <AppShell title="Ferramentas PDF">
      <div className="card-soft p-4">
        <div className="mb-3 flex items-start gap-2">
          <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Tudo é processado no seu dispositivo — os arquivos não são enviados ao servidor. Você
            visualiza, escolhe as páginas, o nome e o formato antes de baixar.
          </p>
        </div>

        <Tabs defaultValue="merge">
          <TabsList className="grid h-auto w-full grid-cols-4 gap-1">
            <TabsTrigger value="merge" className="text-[11px]">Unir</TabsTrigger>
            <TabsTrigger value="split" className="text-[11px]">Extrair</TabsTrigger>
            <TabsTrigger value="burst" className="text-[11px]">Dividir</TabsTrigger>
            <TabsTrigger value="remove" className="text-[11px]">Remover</TabsTrigger>
          </TabsList>
          <TabsList className="mt-1 grid h-auto w-full grid-cols-4 gap-1">
            <TabsTrigger value="rotate" className="text-[11px]">Girar</TabsTrigger>
            <TabsTrigger value="wm" className="text-[11px]">Marca</TabsTrigger>
            <TabsTrigger value="num" className="text-[11px]">Numerar</TabsTrigger>
            <TabsTrigger value="img" className="text-[11px]">Imagens</TabsTrigger>
          </TabsList>
          <TabsList className="mt-1 grid h-auto w-full grid-cols-3 gap-1">
            <TabsTrigger value="ocr" className="text-[11px]">Pesquisável</TabsTrigger>
            <TabsTrigger value="txt" className="text-[11px]">Texto/Word</TabsTrigger>
            <TabsTrigger value="zip" className="text-[11px]">Pasta ZIP</TabsTrigger>
          </TabsList>

          <TabsContent value="merge" className="mt-4 space-y-3">
            <FileField id="fm" label="PDFs (2 ou mais, na ordem escolhida)" inputRef={mergeRef} multiple />
            <Button className="w-full" disabled={busy} onClick={merge}>
              <Combine className="mr-1 size-4" /> Unir PDFs
            </Button>
          </TabsContent>

          <TabsContent value="split" className="mt-4 space-y-3">
            <FileField id="fs" label="PDF" inputRef={splitRef} onPick={inspect} />
            {pageInfo && <p className="text-[11px] text-muted-foreground">{pageInfo}</p>}
            <Label htmlFor="rg">Páginas (ex.: 1-3,5)</Label>
            <Input id="rg" value={range} onChange={(e) => setRange(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={extract}>
              <Scissors className="mr-1 size-4" /> Extrair páginas
            </Button>
          </TabsContent>

          <TabsContent value="burst" className="mt-4 space-y-3">
            <FileField id="fb" label="PDF para separar em 1 arquivo por página" inputRef={burstRef} />
            <Button className="w-full" disabled={busy} onClick={burst}>
              <SplitSquareVertical className="mr-1 size-4" /> Dividir em arquivos
            </Button>
          </TabsContent>

          <TabsContent value="remove" className="mt-4 space-y-3">
            <FileField id="fd" label="PDF" inputRef={removeRef} />
            <Label htmlFor="rm">Páginas a remover (ex.: 2,5-6)</Label>
            <Input id="rm" value={removeSpec} onChange={(e) => setRemoveSpec(e.target.value)} />
            <Button className="w-full" variant="destructive" disabled={busy} onClick={removePages}>
              <Trash2 className="mr-1 size-4" /> Remover páginas
            </Button>
          </TabsContent>

          <TabsContent value="rotate" className="mt-4 space-y-3">
            <FileField id="fr" label="PDF" inputRef={rotRef} />
            <Label htmlFor="an">Ângulo (múltiplo de 90)</Label>
            <Input id="an" type="number" step="90" value={angle} onChange={(e) => setAngle(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={rotate}>
              <RotateCw className="mr-1 size-4" /> Rotacionar
            </Button>
          </TabsContent>

          <TabsContent value="wm" className="mt-4 space-y-3">
            <FileField id="fw" label="PDF" inputRef={wmRef} />
            <Label htmlFor="tx">Texto da marca d'água</Label>
            <Input id="tx" value={text} onChange={(e) => setText(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={watermark}>
              <Droplets className="mr-1 size-4" /> Aplicar marca d'água
            </Button>
          </TabsContent>

          <TabsContent value="num" className="mt-4 space-y-3">
            <FileField id="fn" label="PDF" inputRef={numRef} />
            <Button className="w-full" disabled={busy} onClick={numberPages}>
              <Hash className="mr-1 size-4" /> Numerar páginas
            </Button>
          </TabsContent>

          <TabsContent value="img" className="mt-4 space-y-3">
            <FileField
              id="fi"
              label="Imagens JPG/PNG"
              inputRef={imgRef}
              multiple
              accept="image/jpeg,image/png"
            />
            <Button className="w-full" disabled={busy} onClick={imagesToPdf}>
              <Images className="mr-1 size-4" /> Gerar PDF das imagens
            </Button>
          </TabsContent>
          <TabsContent value="ocr" className="mt-4 space-y-3">
            <FileField id="fo" label="PDF digitalizado (até 30 páginas)" inputRef={ocrRef} />
            <p className="text-[11px] text-muted-foreground">
              Aplica reconhecimento de texto e devolve um PDF em que é possível pesquisar qualquer
              palavra, mantendo a aparência original.
            </p>
            <Button className="w-full" disabled={busy} onClick={searchable}>
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ScanText className="mr-1 size-4" />}
              Gerar PDF pesquisável
            </Button>
          </TabsContent>

          <TabsContent value="txt" className="mt-4 space-y-3">
            <FileField id="ft" label="PDF para converter" inputRef={txtRef} />
            <Button className="w-full" disabled={busy} onClick={toText}>
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <FileType2 className="mr-1 size-4" />}
              Extrair texto
            </Button>
            {textResult && (
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
                    Baixar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="zip" className="mt-4 space-y-3">
            <Label htmlFor="fnm">Nome da pasta</Label>
            <Input id="fnm" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
            <FileField
              id="fz"
              label="Arquivos (PDF, imagens, planilhas, qualquer formato)"
              inputRef={zipRef}
              multiple
              accept="*/*"
              onPick={setZipFiles}
            />
            <Button className="w-full" disabled={busy} onClick={buildZip}>
              <FolderArchive className="mr-1 size-4" /> Baixar pasta em ZIP
            </Button>
          </TabsContent>
        </Tabs>

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
    </AppShell>
  );
}
