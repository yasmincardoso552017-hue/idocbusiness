import { useEffect, useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Loader2,
  RotateCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { renderPdfPages, rasterizePages, type RenderedPage } from "@/lib/pdf-preview";

type PageState = { src: number; rotation: number; selected: boolean };

const FORMATS = [
  { value: "pdf", label: "PDF (arquivo único)", ext: "pdf" },
  { value: "pdf-zip", label: "PDF — 1 arquivo por página (ZIP)", ext: "zip" },
  { value: "png", label: "PNG (imagem)", ext: "png" },
  { value: "jpg", label: "JPG (imagem)", ext: "jpg" },
  { value: "webp", label: "WEBP (imagem)", ext: "webp" },
] as const;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function PdfWorkbench({
  bytes,
  defaultName,
  onClose,
}: {
  bytes: Uint8Array;
  defaultName: string;
  onClose: () => void;
}) {
  const [thumbs, setThumbs] = useState<RenderedPage[]>([]);
  const [pages, setPages] = useState<PageState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(defaultName);
  const [format, setFormat] = useState<(typeof FORMATS)[number]["value"]>("pdf");
  const [range, setRange] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    renderPdfPages(bytes)
      .then((res) => {
        if (!alive) return;
        setThumbs(res);
        setPages(res.map((r) => ({ src: r.index, rotation: 0, selected: true })));
      })
      .catch(() => toast.error("Não foi possível gerar a pré-visualização"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bytes]);

  useEffect(() => () => thumbs.forEach((t) => URL.revokeObjectURL(t.url)), [thumbs]);

  const selectedCount = useMemo(() => pages.filter((p) => p.selected).length, [pages]);

  const setAll = (selected: boolean) => setPages((prev) => prev.map((p) => ({ ...p, selected })));

  const applyRange = () => {
    const wanted = new Set<number>();
    for (const part of range.split(",")) {
      const piece = part.trim();
      if (!piece) continue;
      const [a, b] = piece.split("-").map((n) => parseInt(n.trim(), 10));
      if (!a || Number.isNaN(a)) continue;
      const end = b && !Number.isNaN(b) ? b : a;
      for (let i = a; i <= end; i++) wanted.add(i - 1);
    }
    if (!wanted.size) return toast.error("Informe páginas válidas, ex.: 1-3,7");
    setPages((prev) => prev.map((p, i) => ({ ...p, selected: wanted.has(i) })));
  };

  const toggle = (i: number) =>
    setPages((prev) => prev.map((p, idx) => (idx === i ? { ...p, selected: !p.selected } : p)));

  const rotatePage = (i: number) =>
    setPages((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );

  const move = (i: number, dir: -1 | 1) =>
    setPages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function buildPdf(indexes: PageState[]) {
    const src = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const copied = await out.copyPages(
      src,
      indexes.map((p) => p.src),
    );
    copied.forEach((page, k) => {
      const rot = indexes[k].rotation;
      if (rot) page.setRotation(degrees(((page.getRotation().angle + rot) % 360 + 360) % 360));
      out.addPage(page);
    });
    return await out.save();
  }

  async function handleSave() {
    const chosen = pages.filter((p) => p.selected);
    if (!chosen.length) return toast.error("Selecione ao menos uma página");
    const base = (name.trim() || defaultName).replace(/\.[a-z0-9]+$/i, "") || "documento";
    setSaving(true);
    try {
      if (format === "pdf") {
        download(
          new Blob([(await buildPdf(chosen)) as unknown as BlobPart], { type: "application/pdf" }),
          `${base}.pdf`,
        );
      } else if (format === "pdf-zip") {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (let i = 0; i < chosen.length; i++) {
          zip.file(`${base}-${String(i + 1).padStart(3, "0")}.pdf`, await buildPdf([chosen[i]]));
        }
        download(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
      } else {
        const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
        // rasteriza a partir do PDF já reordenado/rotacionado
        const staged = await buildPdf(chosen);
        const imgs = await rasterizePages(
          staged,
          chosen.map((_, i) => i),
          mime,
        );
        if (imgs.length === 1) {
          download(imgs[0].blob, `${base}.${format}`);
        } else {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          imgs.forEach((img, i) =>
            zip.file(`${base}-${String(i + 1).padStart(3, "0")}.${format}`, img.blob),
          );
          download(await zip.generateAsync({ type: "blob" }), `${base}-${format}.zip`);
        }
      }
      toast.success("Download iniciado");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar o arquivo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Pré-visualizar e editar</p>
          <p className="text-[11px] text-muted-foreground">
            {loading ? "Renderizando páginas…" : `${selectedCount} de ${pages.length} página(s) selecionada(s)`}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAll(true)}>
              Selecionar todas
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAll(false)}>
              Limpar
            </Button>
            <div className="flex items-end gap-2">
              <Input
                value={range}
                placeholder="ex.: 1-3,7"
                onChange={(e) => setRange(e.target.value)}
                className="h-9 w-32"
              />
              <Button size="sm" variant="outline" onClick={applyRange}>
                Aplicar
              </Button>
            </div>
          </div>

          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((p, i) => {
              const thumb = thumbs.find((t) => t.index === p.src)!;
              return (
                <div
                  key={`${p.src}-${i}`}
                  className={`relative rounded-lg border p-1 transition ${
                    p.selected ? "border-primary bg-primary/5" : "border-border opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="block w-full"
                    aria-label={`Selecionar página ${i + 1}`}
                  >
                    <img
                      src={thumb.url}
                      alt={`Página ${i + 1}`}
                      loading="lazy"
                      className="w-full rounded bg-white"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  </button>
                  {p.selected && (
                    <span className="absolute left-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="pl-1 text-[11px] text-muted-foreground">{i + 1}</span>
                    <div className="flex">
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Mover para trás" onClick={() => move(i, -1)}>
                        <ArrowLeft className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Girar página" onClick={() => rotatePage(i)}>
                        <RotateCw className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Mover para frente" onClick={() => move(i, 1)}>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="outname">Nome do arquivo</Label>
              <Input id="outname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-3 w-full" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Download className="mr-1 size-4" />}
            Salvar e baixar
          </Button>
        </>
      )}
    </div>
  );
}
