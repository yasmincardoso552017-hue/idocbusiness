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
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

function save(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

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

  const [range, setRange] = useState("1-2");
  const [removeSpec, setRemoveSpec] = useState("1");
  const [angle, setAngle] = useState("90");
  const [text, setText] = useState("CONFIDENCIAL");
  const [busy, setBusy] = useState(false);
  const [pageInfo, setPageInfo] = useState<string | null>(null);

  async function run(fn: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    try {
      const msg = await fn();
      toast.success(msg);
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
      save(await out.save(), "docflow-unido.pdf");
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
      save(await out.save(), "docflow-paginas.pdf");
      return `${idx.length} página(s) extraída(s)`;
    });

  const burst = () =>
    run(async () => {
      const f = burstRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const src = await loadPdf(f);
      const total = src.getPageCount();
      if (total > 60) throw new Error("Limite de 60 páginas para separar em arquivos");
      for (let i = 0; i < total; i++) {
        const out = await PDFDocument.create();
        const [page] = await out.copyPages(src, [i]);
        out.addPage(page);
        save(await out.save(), `docflow-pagina-${String(i + 1).padStart(2, "0")}.pdf`);
        await new Promise((r) => setTimeout(r, 120));
      }
      return `${total} arquivo(s) gerado(s)`;
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
      save(await out.save(), "docflow-sem-paginas.pdf");
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
      save(await pdf.save(), "docflow-rotacionado.pdf");
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
      save(await pdf.save(), "docflow-marca-dagua.pdf");
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
      save(await pdf.save(), "docflow-numerado.pdf");
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
      save(await out.save(), "docflow-imagens.pdf");
      return `PDF criado com ${files.length} imagem(ns)`;
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
            Tudo é processado no seu dispositivo — os arquivos não são enviados ao servidor. O
            resultado é baixado automaticamente.
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
        </Tabs>
      </div>
    </AppShell>
  );
}
