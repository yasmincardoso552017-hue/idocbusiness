import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Circle,
  Highlighter,
  ImagePlus,
  Loader2,
  Minus,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";

type Tool = "select" | "text" | "image" | "rect" | "ellipse" | "line" | "arrow" | "highlight" | "draw";
type FontId = "helvetica" | "times" | "courier";

type Item = {
  id: string;
  page: number;
  type: Exclude<Tool, "select">;
  /** Coordenadas na escala base da página renderizada (zoom 1). */
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  size?: number;
  font?: FontId;
  bold?: boolean;
  color: string;
  stroke?: number;
  fill?: boolean;
  dataUrl?: string;
  points?: { x: number; y: number }[];
};

const COLORS = ["#0f172a", "#1d4ed8", "#dc2626", "#16a34a", "#f59e0b", "#facc15", "#ec4899"];
const FONT_CSS: Record<FontId, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};

/** Editor visual de PDF: texto direto na folha, imagens, formas, destaque, caneta, desfazer/refazer. */
export function PdfEditor({
  file,
  onResult,
  flattenDefault = false,
  suffix = "-editado",
}: {
  file: File;
  onResult: (bytes: Uint8Array, name: string) => void;
  flattenDefault?: boolean;
  suffix?: string;
}) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [page, setPage] = useState(0);
  const [tool, setTool] = useState<Tool>("text");
  const [color, setColor] = useState(COLORS[0]!);
  const [stroke, setStroke] = useState(2);
  const [fontSize, setFontSize] = useState(14);
  const [font, setFont] = useState<FontId>("helvetica");
  const [zoom, setZoom] = useState(1);
  const [items, setItemsRaw] = useState<Item[]>([]);
  const [past, setPast] = useState<Item[][]>([]);
  const [future, setFuture] = useState<Item[][]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flatten, setFlatten] = useState(flattenDefault);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const pendingImagePos = useRef<{ x: number; y: number } | null>(null);
  const gesture = useRef<
    | { kind: "draw"; item: Item }
    | { kind: "create"; item: Item; ox: number; oy: number }
    | { kind: "move"; id: string; dx: number; dy: number }
    | { kind: "resize"; id: string }
    | null
  >(null);
  const snapshot = useRef<Item[] | null>(null);

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

  /** Aplica uma mudança registrando histórico. */
  const commit = useCallback((next: Item[] | ((p: Item[]) => Item[])) => {
    setItemsRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      setPast((h) => [...h.slice(-80), prev]);
      setFuture([]);
      return value;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1]!;
      setItemsRaw((cur) => {
        setFuture((f) => [cur, ...f]);
        return prev;
      });
      return h.slice(0, -1);
    });
    setActive(null);
    setEditing(null);
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0]!;
      setItemsRaw((cur) => {
        setPast((h) => [...h, cur]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const removeActive = useCallback(() => {
    if (!active) return;
    commit((p) => p.filter((i) => i.id !== active));
    setActive(null);
    setEditing(null);
  }, [active, commit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (typing) return;
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !typing && active) {
        e.preventDefault();
        removeActive();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeActive, active]);

  const current = pages.find((p) => p.index === page);
  const pageItems = useMemo(() => items.filter((i) => i.page === page), [items, page]);

  function point(e: React.PointerEvent, host: HTMLElement) {
    const r = host.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const host = e.currentTarget;
    const { x, y } = point(e, host);
    const id = crypto.randomUUID();
    if (tool === "select") {
      setActive(null);
      setEditing(null);
      return;
    }
    host.setPointerCapture(e.pointerId);
    if (tool === "draw") {
      gesture.current = {
        kind: "draw",
        item: { id, page, type: "draw", x: 0, y: 0, w: 0, h: 0, color, stroke, points: [{ x, y }] },
      };
      snapshot.current = items;
      return;
    }
    if (tool === "text") {
      const item: Item = { id, page, type: "text", x, y: y - fontSize * 0.6, w: 220, h: fontSize * 1.5, text: "", size: fontSize, font, color };
      commit((p) => [...p, item]);
      setActive(id);
      setEditing(id);
      return;
    }
    if (tool === "image") {
      pendingImagePos.current = { x, y };
      imgInput.current?.click();
      return;
    }
    const type = tool;
    const item: Item = {
      id,
      page,
      type,
      x,
      y,
      w: 0,
      h: 0,
      color: type === "highlight" ? (["#facc15", "#16a34a", "#1d4ed8", "#ec4899", "#f59e0b"].includes(color) ? color : "#facc15") : color,
      stroke,
    };
    snapshot.current = items;
    gesture.current = { kind: "create", item, ox: x, oy: y };
    setItemsRaw((p) => [...p, item]);
    setActive(id);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const { x, y } = point(e, e.currentTarget);
    if (g.kind === "draw") {
      g.item = { ...g.item, points: [...g.item.points!, { x, y }] };
      const it = g.item;
      setItemsRaw((p) => [...p.filter((i) => i.id !== it.id), it]);
    } else if (g.kind === "create") {
      const line = g.item.type === "line" || g.item.type === "arrow";
      const upd: Item = line
        ? { ...g.item, x: g.ox, y: g.oy, w: x - g.ox, h: y - g.oy }
        : { ...g.item, x: Math.min(g.ox, x), y: Math.min(g.oy, y), w: Math.abs(x - g.ox), h: Math.abs(y - g.oy) };
      g.item = upd;
      setItemsRaw((p) => p.map((i) => (i.id === upd.id ? upd : i)));
    } else if (g.kind === "move") {
      setItemsRaw((p) => p.map((i) => (i.id === g.id ? { ...i, x: x - g.dx, y: y - g.dy } : i)));
    } else if (g.kind === "resize") {
      setItemsRaw((p) =>
        p.map((i) => {
          if (i.id !== g.id) return i;
          if (i.type === "line" || i.type === "arrow") return { ...i, w: x - i.x, h: y - i.y };
          const w = Math.max(16, x - i.x);
          const h = i.type === "image" && i.w > 0 ? (w * i.h) / i.w : Math.max(10, y - i.y);
          return { ...i, w, h };
        }),
      );
    }
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const before = snapshot.current;
    snapshot.current = null;
    if (g.kind === "create") {
      let it = g.item;
      const tiny = Math.abs(it.w) < 6 && Math.abs(it.h) < 6;
      if (tiny) {
        // Clique simples: tamanho padrão no ponto tocado.
        const def = it.type === "highlight" ? { w: 200, h: 20 } : it.type === "line" || it.type === "arrow" ? { w: 140, h: 0 } : { w: 150, h: 90 };
        it = { ...it, ...def };
        setItemsRaw((p) => p.map((i) => (i.id === it.id ? it : i)));
      }
    }
    if (before) {
      setPast((h) => [...h.slice(-80), before]);
      setFuture([]);
    }
  }

  function startMove(e: React.PointerEvent, it: Item) {
    if (tool !== "select" && !(tool === "text" && it.type === "text")) return;
    e.stopPropagation();
    const host = (e.currentTarget as HTMLElement).parentElement!;
    const { x, y } = point(e, host);
    setActive(it.id);
    if (editing === it.id) return;
    snapshot.current = items;
    gesture.current = { kind: "move", id: it.id, dx: x - it.x, dy: y - it.y };
    host.setPointerCapture(e.pointerId);
  }

  function startResize(e: React.PointerEvent, it: Item) {
    e.stopPropagation();
    const host = (e.currentTarget as HTMLElement).closest("[data-page-host]") as HTMLElement;
    snapshot.current = items;
    gesture.current = { kind: "resize", id: it.id };
    host.setPointerCapture(e.pointerId);
  }

  async function pickImage(f: File | undefined) {
    if (!f) return;
    let dataUrl = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(f);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    if (!/image\/(png|jpeg)/.test(dataUrl.slice(0, 30))) {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      dataUrl = c.toDataURL("image/png");
    }
    const w = Math.min(240, img.naturalWidth);
    const h = (w * img.naturalHeight) / img.naturalWidth;
    const pos = pendingImagePos.current ?? { x: 60, y: 60 };
    const id = crypto.randomUUID();
    commit((p) => [...p, { id, page, type: "image", x: pos.x, y: pos.y, w, h, color, dataUrl }]);
    setActive(id);
    setTool("select");
    if (imgInput.current) imgInput.current.value = "";
  }

  function patchActive(patch: Partial<Item>) {
    if (!active) return;
    commit((p) => p.map((i) => (i.id === active ? { ...i, ...patch } : i)));
  }

  async function apply() {
    if (!bytes || !current) return;
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb, LineCapStyle } = await import("pdf-lib");
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const fonts = {
        helvetica: [await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold)],
        times: [await pdf.embedFont(StandardFonts.TimesRoman), await pdf.embedFont(StandardFonts.TimesRomanBold)],
        courier: [await pdf.embedFont(StandardFonts.Courier), await pdf.embedFont(StandardFonts.CourierBold)],
      } as const;
      const docPages = pdf.getPages();
      for (const rendered of pages) {
        const target = docPages[rendered.index];
        if (!target) continue;
        const list = items.filter((i) => i.page === rendered.index);
        if (!list.length) continue;
        const { width: pw, height: ph } = target.getSize();
        const k = pw / rendered.width;
        const X = (v: number) => v * k;
        const Y = (v: number) => ph - v * k;
        for (const it of list) {
          const c = hexToRgb(it.color);
          const paint = rgb(c.r, c.g, c.b);
          const sw = (it.stroke ?? 2) * k;
          if (it.type === "text") {
            const text = sanitize(it.text ?? "");
            if (!text.trim()) continue;
            const f = fonts[it.font ?? "helvetica"][it.bold ? 1 : 0];
            const size = (it.size ?? 14) * k;
            text.split("\n").forEach((line, n) => {
              target.drawText(line, { x: X(it.x + 2), y: Y(it.y + 2) - size * (n + 0.85) * 1.15, size, font: f, color: paint });
            });
          } else if (it.type === "rect") {
            target.drawRectangle({ x: X(it.x), y: Y(it.y + it.h), width: it.w * k, height: it.h * k, borderColor: paint, borderWidth: sw, ...(it.fill ? { color: paint, opacity: 0.25 } : {}) });
          } else if (it.type === "ellipse") {
            target.drawEllipse({ x: X(it.x + it.w / 2), y: Y(it.y + it.h / 2), xScale: (it.w * k) / 2, yScale: (it.h * k) / 2, borderColor: paint, borderWidth: sw, ...(it.fill ? { color: paint, opacity: 0.25 } : {}) });
          } else if (it.type === "highlight") {
            target.drawRectangle({ x: X(it.x), y: Y(it.y + it.h), width: it.w * k, height: it.h * k, color: paint, opacity: 0.35 });
          } else if (it.type === "line" || it.type === "arrow") {
            const a = { x: X(it.x), y: Y(it.y) };
            const b = { x: X(it.x + it.w), y: Y(it.y + it.h) };
            target.drawLine({ start: a, end: b, thickness: sw, color: paint, lineCap: LineCapStyle.Round });
            if (it.type === "arrow") {
              const ang = Math.atan2(b.y - a.y, b.x - a.x);
              const len = Math.max(8, sw * 5);
              for (const d of [Math.PI - 0.45, Math.PI + 0.45]) {
                target.drawLine({ start: b, end: { x: b.x + len * Math.cos(ang + d), y: b.y + len * Math.sin(ang + d) }, thickness: sw, color: paint, lineCap: LineCapStyle.Round });
              }
            }
          } else if (it.type === "image" && it.dataUrl) {
            const raw = Uint8Array.from(atob(it.dataUrl.split(",")[1] ?? ""), (ch) => ch.charCodeAt(0));
            const img = it.dataUrl.startsWith("data:image/png") ? await pdf.embedPng(raw) : await pdf.embedJpg(raw);
            target.drawImage(img, { x: X(it.x), y: Y(it.y + it.h), width: it.w * k, height: it.h * k });
          } else if (it.type === "draw" && it.points) {
            for (let i = 1; i < it.points.length; i++) {
              const a = it.points[i - 1]!;
              const b = it.points[i]!;
              target.drawLine({ start: { x: X(a.x), y: Y(a.y) }, end: { x: X(b.x), y: Y(b.y) }, thickness: sw, color: paint, lineCap: LineCapStyle.Round });
            }
          }
        }
      }
      let out = await pdf.save();
      if (flatten) {
        const { flattenToImages } = await import("@/lib/pdf-tools");
        out = await flattenToImages(out, 2, 0.86);
      }
      onResult(out, file.name.replace(/\.pdf$/i, "") + suffix);
      toast.success("Alterações aplicadas — revise e baixe");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao aplicar as alterações");
    } finally {
      setBusy(false);
    }
  }

  const activeItem = items.find((i) => i.id === active);
  const tools = [
    ["select", MousePointer2, "Mover"],
    ["text", Type, "Texto"],
    ["image", ImagePlus, "Imagem"],
    ["rect", Square, "Retângulo"],
    ["ellipse", Circle, "Círculo"],
    ["line", Minus, "Linha"],
    ["arrow", ArrowUpRight, "Seta"],
    ["highlight", Highlighter, "Destacar"],
    ["draw", Pen, "Desenhar"],
  ] as const;

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-1">
        {tools.map(([id, Icon, label]) => (
          <Button key={id} size="sm" variant={tool === id ? "default" : "outline"} onClick={() => setTool(id)} className="text-[11px]">
            <Icon className="mr-1 size-3.5" /> {label}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={undo} disabled={!past.length} aria-label="Desfazer">
          <Undo2 className="size-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={redo} disabled={!future.length} aria-label="Refazer">
          <Redo2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Cor ${c}`}
              onClick={() => {
                setColor(c);
                if (activeItem && activeItem.type !== "image") patchActive({ color: c });
              }}
              style={{ background: c }}
              className={`size-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            />
          ))}
        </div>
        <label className="flex items-center gap-1">
          Espessura
          <input type="range" min={1} max={10} value={stroke} onChange={(e) => { const v = Number(e.target.value); setStroke(v); if (activeItem) patchActive({ stroke: v }); }} />
        </label>
        <select className="rounded border border-border bg-background px-1 py-0.5" value={activeItem?.type === "text" ? activeItem.font ?? "helvetica" : font} onChange={(e) => { const v = e.target.value as FontId; setFont(v); if (activeItem?.type === "text") patchActive({ font: v }); }}>
          <option value="helvetica">Helvetica</option>
          <option value="times">Times</option>
          <option value="courier">Courier</option>
        </select>
        <input
          type="number"
          min={6}
          max={96}
          className="w-14 rounded border border-border bg-background px-1 py-0.5"
          value={activeItem?.type === "text" ? activeItem.size ?? 14 : fontSize}
          onChange={(e) => { const v = Number(e.target.value) || 14; setFontSize(v); if (activeItem?.type === "text") patchActive({ size: v, h: Math.max(activeItem.h, v * 1.5) }); }}
          aria-label="Tamanho da fonte"
        />
        {activeItem?.type === "text" && (
          <Button size="sm" variant={activeItem.bold ? "default" : "outline"} onClick={() => patchActive({ bold: !activeItem.bold })} className="h-7 px-2 font-bold">B</Button>
        )}
        {(activeItem?.type === "rect" || activeItem?.type === "ellipse") && (
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={!!activeItem.fill} onChange={(e) => patchActive({ fill: e.target.checked })} /> Preencher
          </label>
        )}
      </div>

      <input ref={imgInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
          <span>
            Página{" "}
            <input
              type="number"
              min={1}
              max={pages.length || 1}
              value={page + 1}
              onChange={(e) => { const n = Number(e.target.value) - 1; if (n >= 0 && n < pages.length) setPage(n); }}
              className="w-12 rounded border border-border bg-background px-1 text-center"
            />{" "}
            de {pages.length || "…"}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pages.length - 1} onClick={() => setPage(page + 1)}>›</Button>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))} aria-label="Diminuir zoom"><ZoomOut className="size-3.5" /></Button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} aria-label="Aumentar zoom"><ZoomIn className="size-3.5" /></Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(1)}>Ajustar</Button>
        </div>
      </div>

      <div className="max-h-[75vh] overflow-auto rounded-lg bg-secondary/40 p-2">
        {current ? (
          <div
            data-page-host
            className="relative mx-auto touch-none select-none bg-white shadow"
            style={{ width: current.width * zoom, height: current.height * zoom, cursor: tool === "select" ? "default" : "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img src={current.url} alt={`Página ${page + 1}`} draggable={false} className="pointer-events-none absolute inset-0 size-full" />
            <svg className="pointer-events-none absolute inset-0" width={current.width * zoom} height={current.height * zoom}>
              {pageItems.map((it) => {
                const s = (it.stroke ?? 2) * zoom;
                if (it.type === "draw")
                  return <polyline key={it.id} points={(it.points ?? []).map((p) => `${p.x * zoom},${p.y * zoom}`).join(" ")} fill="none" stroke={it.color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />;
                if (it.type === "line" || it.type === "arrow") {
                  const x1 = it.x * zoom, y1 = it.y * zoom, x2 = (it.x + it.w) * zoom, y2 = (it.y + it.h) * zoom;
                  const ang = Math.atan2(y2 - y1, x2 - x1);
                  const len = Math.max(8, s * 5);
                  return (
                    <g key={it.id} stroke={it.color} strokeWidth={s} strokeLinecap="round">
                      <line x1={x1} y1={y1} x2={x2} y2={y2} />
                      {it.type === "arrow" && [Math.PI - 0.45, Math.PI + 0.45].map((d) => (
                        <line key={d} x1={x2} y1={y2} x2={x2 + len * Math.cos(ang + d)} y2={y2 + len * Math.sin(ang + d)} />
                      ))}
                    </g>
                  );
                }
                return null;
              })}
            </svg>
            {pageItems.map((it) => {
              if (it.type === "draw") return null;
              const line = it.type === "line" || it.type === "arrow";
              const box = line
                ? { left: Math.min(it.x, it.x + it.w) * zoom - 6, top: Math.min(it.y, it.y + it.h) * zoom - 6, width: Math.abs(it.w) * zoom + 12, height: Math.abs(it.h) * zoom + 12 }
                : { left: it.x * zoom, top: it.y * zoom, width: it.w * zoom, height: it.h * zoom };
              return (
                <div
                  key={it.id}
                  onPointerDown={(e) => startMove(e, it)}
                  onDoubleClick={() => it.type === "text" && setEditing(it.id)}
                  className={`absolute ${tool === "select" ? "cursor-move" : ""} ${active === it.id ? "outline outline-2 outline-primary" : ""}`}
                  style={box}
                >
                  {it.type === "text" &&
                    (editing === it.id ? (
                      <textarea
                        autoFocus
                        value={it.text ?? ""}
                        placeholder="Digite aqui"
                        onPointerDown={(e) => e.stopPropagation()}
                        onFocus={() => { snapshot.current = items; }}
                        onChange={(e) => {
                          const v = e.target.value;
                          const lines = v.split("\n").length;
                          setItemsRaw((p) => p.map((i) => (i.id === it.id ? { ...i, text: v, h: Math.max(i.h, (i.size ?? 14) * 1.3 * lines + 4) } : i)));
                        }}
                        onBlur={() => {
                          const before = snapshot.current;
                          snapshot.current = null;
                          if (before) { setPast((h) => [...h, before]); setFuture([]); }
                          setEditing(null);
                          if (!(it.text ?? "").trim()) setItemsRaw((p) => p.filter((i) => i.id !== it.id));
                        }}
                        className="size-full resize-none border-0 bg-transparent p-0.5 outline-none"
                        style={{ color: it.color, fontSize: (it.size ?? 14) * zoom, lineHeight: 1.15, fontFamily: FONT_CSS[it.font ?? "helvetica"], fontWeight: it.bold ? 700 : 400 }}
                      />
                    ) : (
                      <span className="block size-full whitespace-pre-wrap p-0.5" style={{ color: it.color, fontSize: (it.size ?? 14) * zoom, lineHeight: 1.15, fontFamily: FONT_CSS[it.font ?? "helvetica"], fontWeight: it.bold ? 700 : 400 }}>
                        {it.text}
                      </span>
                    ))}
                  {it.type === "rect" && <div className="size-full" style={{ border: `${(it.stroke ?? 2) * zoom}px solid ${it.color}`, background: it.fill ? `${it.color}40` : undefined }} />}
                  {it.type === "ellipse" && <div className="size-full rounded-full" style={{ border: `${(it.stroke ?? 2) * zoom}px solid ${it.color}`, background: it.fill ? `${it.color}40` : undefined }} />}
                  {it.type === "highlight" && <div className="size-full" style={{ background: it.color, opacity: 0.35 }} />}
                  {it.type === "image" && it.dataUrl && <img src={it.dataUrl} alt="Imagem inserida" draggable={false} className="pointer-events-none size-full object-fill" />}
                  {active === it.id && tool === "select" && (
                    <span
                      onPointerDown={(e) => startResize(e, it)}
                      className="absolute -bottom-2 -right-2 size-4 cursor-se-resize rounded-full border-2 border-background bg-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 inline size-4 animate-spin" /> Carregando páginas…
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Dica: com Texto, toque na folha e digite. Use Mover para arrastar, redimensionar pela bolinha e toque duplo para editar o texto.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {active && (
          <Button size="sm" variant="outline" onClick={removeActive}>
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
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x0A\x20-\xFF]/g, "");
}
