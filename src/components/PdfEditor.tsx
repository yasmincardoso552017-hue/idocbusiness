import { useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, ImagePlus, Loader2, Pen, Square, Trash2, Type, MousePointer2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";

type Tool = "select" | "text" | "image" | "shape" | "highlight" | "draw";

type Item = {
  id: string;
  page: number;
  type: Exclude<Tool, "select">;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  size?: number;
  color: string;
  dataUrl?: string;
  points?: { x: number; y: number }[];
};

const COLORS = ["#0f172a", "#1d4ed8", "#dc2626", "#16a34a", "#f59e0b"];

/** Editor visual de PDF: textos, imagens, formas, desenho livre e destaques. */
export function PdfEditor({
  file,
  onResult,
  flattenDefault = false,
}: {
  file: File;
  onResult: (bytes: Uint8Array, name: string) => void;
  flattenDefault?: boolean;
}) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [page, setPage] = useState(0);
  const [tool, setTool] = useState<Tool>("text");
  const [color, setColor] = useState(COLORS[0]!);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flatten, setFlatten] = useState(flattenDefault);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const drawing = useRef<Item | null>(null);
  const dragging = useRef<{ id: string; dx: number; dy: number; resize: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = new Uint8Array(await file.arrayBuffer());
      setBytes(raw);
      const rendered = await renderPdfPages(raw.slice(0), 820, (p) => {
        if (alive) setPages((prev) => (prev.some((x) => x.index === p.index) ? prev : [...prev, p]));
      });
      if (alive) setPages(rendered);
    })().catch(() => toast.error("Não foi possível abrir este PDF"));
    return () => {
      alive = false;
    };
  }, [file]);

  const current = pages.find((p) => p.index === page);
  const pageItems = useMemo(() => items.filter((i) => i.page === page), [items, page]);

  function addAt(clientX: number, clientY: number, host: HTMLDivElement) {
    const rect = host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const id = crypto.randomUUID();
    if (tool === "text") {
      setItems((p) => [...p, { id, page, type: "text", x, y, w: 200, h: 26, text: "Texto", size: 14, color }]);
      setActive(id);
    } else if (tool === "shape") {
      setItems((p) => [...p, { id, page, type: "shape", x, y, w: 160, h: 90, color }]);
      setActive(id);
    } else if (tool === "highlight") {
      setItems((p) => [...p, { id, page, type: "highlight", x, y, w: 200, h: 22, color: "#facc15" }]);
      setActive(id);
    } else if (tool === "image") {
      imgInput.current?.click();
    }
  }

  async function pickImage(f: File | undefined) {
    if (!f) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(f);
    });
    const id = crypto.randomUUID();
    setItems((p) => [...p, { id, page, type: "image", x: 60, y: 60, w: 220, h: 140, color, dataUrl }]);
    setActive(id);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const host = e.currentTarget;
    if (tool === "draw") {
      const rect = host.getBoundingClientRect();
      drawing.current = {
        id: crypto.randomUUID(),
        page,
        type: "draw",
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        color,
        points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
      };
      host.setPointerCapture(e.pointerId);
      return;
    }
    if (tool !== "select" && e.target === host) addAt(e.clientX, e.clientY, host);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (drawing.current) {
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      drawing.current.points!.push(pt);
      setItems((p) => [...p.filter((i) => i.id !== drawing.current!.id), { ...drawing.current! }]);
      return;
    }
    const d = dragging.current;
    if (!d) return;
    setItems((p) =>
      p.map((i) => {
        if (i.id !== d.id) return i;
        if (d.resize)
          return {
            ...i,
            w: Math.max(24, e.clientX - rect.left - i.x),
            h: Math.max(16, e.clientY - rect.top - i.y),
          };
        return { ...i, x: e.clientX - rect.left - d.dx, y: e.clientY - rect.top - d.dy };
      }),
    );
  }

  function onPointerUp() {
    drawing.current = null;
    dragging.current = null;
  }

  async function apply() {
    if (!bytes || !current) return;
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const docPages = pdf.getPages();
      for (const rendered of pages) {
        const target = docPages[rendered.index];
        if (!target) continue;
        const rotated = target.getRotation().angle % 180 !== 0;
        const pw = rotated ? target.getHeight() : target.getWidth();
        const ph = rotated ? target.getWidth() : target.getHeight();
        const k = pw / rendered.width;
        for (const it of items.filter((i) => i.page === rendered.index)) {
          const x = it.x * k;
          const w = it.w * k;
          const h = it.h * k;
          const y = ph - it.y * k - h;
          const c = hexToRgb(it.color);
          const paint = rgb(c.r, c.g, c.b);
          if (it.type === "text") {
            const size = (it.size ?? 14) * k;
            target.drawText(sanitize(it.text ?? ""), {
              x,
              y: ph - it.y * k - size,
              size,
              font,
              color: paint,
              rotate: degrees(0),
            });
          } else if (it.type === "shape") {
            target.drawRectangle({ x, y, width: w, height: h, borderColor: paint, borderWidth: 1.5 });
          } else if (it.type === "highlight") {
            target.drawRectangle({ x, y, width: w, height: h, color: paint, opacity: 0.35 });
          } else if (it.type === "image" && it.dataUrl) {
            const raw = Uint8Array.from(atob(it.dataUrl.split(",")[1] ?? ""), (ch) => ch.charCodeAt(0));
            const img = it.dataUrl.includes("image/png")
              ? await pdf.embedPng(raw)
              : await pdf.embedJpg(raw);
            target.drawImage(img, { x, y, width: w, height: h });
          } else if (it.type === "draw" && it.points) {
            for (let i = 1; i < it.points.length; i++) {
              const a = it.points[i - 1]!;
              const b = it.points[i]!;
              target.drawLine({
                start: { x: a.x * k, y: ph - a.y * k },
                end: { x: b.x * k, y: ph - b.y * k },
                thickness: 1.8,
                color: paint,
              });
            }
          }
        }
      }
      let out = await pdf.save();
      if (flatten) {
        const { flattenToImages } = await import("@/lib/pdf-tools");
        out = await flattenToImages(out, 2, 0.86);
      }
      onResult(out, file.name.replace(/\.pdf$/i, "-editado"));
      toast.success("Alterações aplicadas — revise e baixe");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao aplicar as alterações");
    } finally {
      setBusy(false);
    }
  }

  const activeItem = items.find((i) => i.id === active);

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-1">
        {(
          [
            ["select", MousePointer2, "Mover"],
            ["text", Type, "Texto"],
            ["image", ImagePlus, "Imagem"],
            ["shape", Square, "Forma"],
            ["highlight", Highlighter, "Destacar"],
            ["draw", Pen, "Desenhar"],
          ] as const
        ).map(([id, Icon, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tool === id ? "default" : "outline"}
            onClick={() => setTool(id)}
            className="text-[11px]"
          >
            <Icon className="mr-1 size-3.5" /> {label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Cor ${c}`}
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={`size-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            />
          ))}
        </div>
      </div>

      <input
        ref={imgInput}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => pickImage(e.target.files?.[0])}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹
          </Button>
          <span>
            Página {page + 1} de {pages.length || "…"}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages.length - 1}
            onClick={() => setPage(page + 1)}
          >
            ›
          </Button>
        </div>
        {pageItems.length > 0 && <span>{pageItems.length} elemento(s) nesta página</span>}
      </div>

      <div className="overflow-auto rounded-lg bg-secondary/40 p-2">
        {current ? (
          <div
            className="relative mx-auto touch-none select-none bg-white shadow"
            style={{ width: current.width, height: current.height }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img src={current.url} alt={`Página ${page + 1}`} width={current.width} height={current.height} />
            {pageItems.map((it) =>
              it.type === "draw" ? (
                <svg
                  key={it.id}
                  className="pointer-events-none absolute inset-0"
                  width={current.width}
                  height={current.height}
                >
                  <polyline
                    points={(it.points ?? []).map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={it.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div
                  key={it.id}
                  onPointerDown={(e) => {
                    if (tool !== "select" && tool !== "text") return;
                    e.stopPropagation();
                    setActive(it.id);
                    dragging.current = { id: it.id, dx: e.clientX - e.currentTarget.getBoundingClientRect().left, dy: e.clientY - e.currentTarget.getBoundingClientRect().top, resize: false };
                  }}
                  className={`absolute cursor-move ${active === it.id ? "outline outline-2 outline-primary" : ""}`}
                  style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                >
                  {it.type === "text" && (
                    <span
                      style={{ color: it.color, fontSize: it.size, lineHeight: 1.1 }}
                      className="block whitespace-pre-wrap font-medium"
                    >
                      {it.text}
                    </span>
                  )}
                  {it.type === "shape" && (
                    <div className="size-full rounded-sm" style={{ border: `2px solid ${it.color}` }} />
                  )}
                  {it.type === "highlight" && (
                    <div className="size-full" style={{ background: it.color, opacity: 0.35 }} />
                  )}
                  {it.type === "image" && it.dataUrl && (
                    <img src={it.dataUrl} alt="Imagem inserida" className="size-full object-contain" />
                  )}
                  {active === it.id && (
                    <span
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragging.current = { id: it.id, dx: 0, dy: 0, resize: true };
                      }}
                      className="absolute -bottom-1.5 -right-1.5 size-4 cursor-se-resize rounded-full border-2 border-background bg-primary"
                    />
                  )}
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 inline size-4 animate-spin" /> Carregando páginas…
          </p>
        )}
      </div>

      {activeItem && activeItem.type === "text" && (
        <div className="space-y-2 rounded-lg border border-border p-2">
          <Label htmlFor="et">Texto</Label>
          <Input
            id="et"
            value={activeItem.text ?? ""}
            onChange={(e) =>
              setItems((p) => p.map((i) => (i.id === activeItem.id ? { ...i, text: e.target.value } : i)))
            }
          />
          <Label htmlFor="es">Tamanho</Label>
          <Input
            id="es"
            type="number"
            value={activeItem.size ?? 14}
            onChange={(e) =>
              setItems((p) =>
                p.map((i) => (i.id === activeItem.id ? { ...i, size: Number(e.target.value) || 14 } : i)),
              )
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {active && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setItems((p) => p.filter((i) => i.id !== active));
              setActive(null);
            }}
          >
            <Trash2 className="mr-1 size-3.5" /> Excluir elemento
          </Button>
        )}
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
          Achatar (torna as marcas permanentes — use para redigir dados sensíveis)
        </label>
        <Button className="ml-auto" size="sm" disabled={busy || !current} onClick={apply}>
          {busy && <Loader2 className="mr-1 size-4 animate-spin" />} Aplicar e revisar
        </Button>
      </div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
}

function sanitize(text: string) {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\xFF]/g, "");
}
