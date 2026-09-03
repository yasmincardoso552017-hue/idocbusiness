import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Send,
  Move,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer2,
} from "lucide-react";

import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { dispatchSigningRequest } from "@/lib/signing.functions";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";

export const Route = createFileRoute("/_authenticated/app/preparar/$requestId")({
  component: Prepare,
});

type FieldType = "signature" | "initials" | "name" | "cpf" | "date" | "text";
const FIELD_LABEL: Record<FieldType, string> = {
  signature: "Assinatura",
  initials: "Rubrica",
  name: "Nome",
  cpf: "CPF",
  date: "Data",
  text: "Texto",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function Prepare() {
  const { requestId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panMode, setPanMode] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  const [activeType, setActiveType] = useState<FieldType>("signature");
  const [activeSigner, setActiveSigner] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "" });

  const { data } = useQuery({
    queryKey: ["prepare", requestId],
    queryFn: async () => {
      const [req, signers, fields] = await Promise.all([
        supabase
          .from("signing_requests")
          .select("*, documents(id, name, page_count, storage_path)")
          .eq("id", requestId)
          .single(),
        supabase.from("signers").select("*").eq("request_id", requestId).order("order_index"),
        supabase.from("signature_fields").select("*").eq("request_id", requestId),
      ]);
      return { request: req.data, signers: signers.data ?? [], fields: fields.data ?? [] };
    },
  });

  const doc = data?.request?.documents as
    | { id: string; name: string; page_count: number | null; storage_path: string | null }
    | undefined;
  const signers = data?.signers ?? [];
  const allFields = data?.fields ?? [];
  const currentSigner = activeSigner || signers[0]?.id || "";

  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!doc?.storage_path) return;
    let cancelled = false;
    setRendering(true);
    setPages([]);
    (async () => {
      try {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storage_path!, 3600);
        if (!signed?.signedUrl) throw new Error("Não foi possível abrir o PDF");
        const bytes = new Uint8Array(await (await fetch(signed.signedUrl)).arrayBuffer());
        await renderPdfPages(bytes, 820, (p) => {
          if (!cancelled) {
            setPages((prev) => [...prev, p]);
            setRendering(false);
          }
        });
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc?.storage_path]);


  const total = pages.length || doc?.page_count || 1;
  const current = pages[page - 1];
  const fields = allFields.filter((f) => f.page === page);
  const refresh = () => qc.invalidateQueries({ queryKey: ["prepare", requestId] });

  async function addSigner() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Informe nome e e-mail");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
    const { error } = await supabase.from("signers").insert({
      request_id: requestId,
      owner_id: auth.user!.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone || null,
      cpf: form.cpf || null,
      order_index: signers.length + 1,
      token,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ name: "", email: "", phone: "", cpf: "" });
    refresh();
  }

  async function removeSigner(id: string) {
    await supabase.from("signature_fields").delete().eq("signer_id", id);
    await supabase.from("signers").delete().eq("id", id);
    refresh();
  }

  async function addFieldAt(xRatio: number, yRatio: number) {
    if (!currentSigner) {
      toast.error("Adicione um signatário primeiro");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const w = activeType === "signature" ? 0.3 : 0.22;
    const h = activeType === "signature" ? 0.07 : 0.04;
    const { error } = await supabase.from("signature_fields").insert({
      request_id: requestId,
      signer_id: currentSigner,
      owner_id: auth.user!.id,
      page,
      x: clamp(xRatio - w / 2, 0, 1 - w),
      y: clamp(yRatio - h / 2, 0, 1 - h),
      w,
      h,
      type: activeType,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  /** Arrasta a página dentro da área visível (útil com zoom alto). */
  function startPan(e: React.PointerEvent) {
    const box = scrollRef.current;
    if (!box) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const left = box.scrollLeft;
    const top = box.scrollTop;
    const onMove = (ev: PointerEvent) => {
      box.scrollLeft = left - (ev.clientX - startX);
      box.scrollTop = top - (ev.clientY - startY);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (panMode) {
      startPan(e);
      return;
    }
    if ((e.target as HTMLElement).closest("[data-field]")) return;
    const box = canvasRef.current!.getBoundingClientRect();
    addFieldAt((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
  }

  /** Arrastar (move) ou redimensionar (resize) o campo com o dedo/mouse. */
  function startGesture(
    e: React.PointerEvent,
    field: { id: string; x: number; y: number; w: number; h: number },
    mode: "move" | "resize",
  ) {
    if (panMode) return;
    e.stopPropagation();
    e.preventDefault();
    setSelected(field.id);
    const box = canvasRef.current!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = { ...field };
    let latest = { ...field };

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / box.width;
      const dy = (ev.clientY - startY) / box.height;
      latest =
        mode === "move"
          ? {
              ...base,
              x: clamp(base.x + dx, 0, 1 - base.w),
              y: clamp(base.y + dy, 0, 1 - base.h),
            }
          : {
              ...base,
              w: clamp(base.w + dx, 0.05, 1 - base.x),
              h: clamp(base.h + dy, 0.02, 1 - base.y),
            };
      setGhost({ ...latest, id: field.id });
    };
    const onUp = async () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setGhost(null);
      await supabase
        .from("signature_fields")
        .update({ x: latest.x, y: latest.y, w: latest.w, h: latest.h })
        .eq("id", field.id);
      refresh();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function nudge(id: string, patch: { x?: number; y?: number; w?: number; h?: number }) {
    await supabase.from("signature_fields").update(patch).eq("id", id);
    refresh();
  }

  async function send() {
    try {
      const res = await dispatchSigningRequest({ data: { requestId } });
      const links = Object.entries(res.links);
      await navigator.clipboard
        ?.writeText(links.map(([e, l]) => `${e}: ${l}`).join("\n"))
        .catch(() => null);
      toast.success("Enviado para assinatura. Links copiados.");
      navigate({ to: "/app/assinaturas" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const sel = allFields.find((f) => f.id === selected);

  return (
    <AppShell title="Preparar assinatura">
      <div className="space-y-4">
        <div className="card-soft p-4">
          <div className="text-xs text-muted-foreground">Documento</div>
          <div className="text-sm font-bold">{doc?.name ?? "—"}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ordem sequencial</span>
              <Switch
                checked={data?.request?.mode === "sequential"}
                onCheckedChange={async (v) => {
                  await supabase
                    .from("signing_requests")
                    .update({ mode: v ? "sequential" : "parallel" })
                    .eq("id", requestId);
                  refresh();
                }}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <Input
                placeholder="Mensagem para os signatários"
                defaultValue={data?.request?.message ?? ""}
                onBlur={async (e) => {
                  await supabase
                    .from("signing_requests")
                    .update({ message: e.target.value })
                    .eq("id", requestId);
                }}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ["require_geo", "Exigir localização"],
              ["require_photo_id", "Exigir documento com foto"],
              ["require_selfie", "Exigir selfie"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs">
                <Switch
                  checked={Boolean((data?.request as Record<string, unknown> | undefined)?.[key])}
                  onCheckedChange={async (v) => {
                    await supabase
                      .from("signing_requests")
                      .update({ [key]: v } as Record<typeof key, boolean>)
                      .eq("id", requestId);
                    refresh();
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="card-soft p-4">
          <h2 className="text-sm font-bold">Signatários</h2>
          <div className="mt-3 space-y-2">
            {signers.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                  {s.order_index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{s.email}</div>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {allFields.filter((f) => f.signer_id === s.id).length} campo(s)
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Copiar link"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/sign/${s.token}`);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => removeSigner(s.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="sn">Nome</Label>
              <Input id="sn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="se">E-mail</Label>
              <Input
                id="se"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sp">Telefone</Label>
              <Input id="sp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sc">CPF</Label>
              <Input id="sc" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
          </div>
          <Button className="mt-3 w-full" onClick={addSigner}>
            <Plus className="mr-1 size-4" /> Adicionar signatário
          </Button>
        </div>

        <div className="card-soft p-4">
          <h2 className="text-sm font-bold">Posicionar campos no documento</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Toque na página para inserir o campo, arraste para mover e use o canto inferior direito
            para ajustar o tamanho.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={activeType} onValueChange={(v) => setActiveType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentSigner} onValueChange={setActiveSigner}>
              <SelectTrigger>
                <SelectValue placeholder="Signatário" />
              </SelectTrigger>
              <SelectContent>
                {signers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              Página {page} de {total}
            </span>
            <Button size="sm" variant="outline" disabled={page >= total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-label="Reduzir zoom"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            >
              <ZoomOut className="size-4" />
            </Button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.25}
              value={zoom}
              aria-label="Zoom da página"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 flex-1 accent-primary"
            />
            <Button
              size="sm"
              variant="outline"
              aria-label="Aumentar zoom"
              onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
            >
              <ZoomIn className="size-4" />
            </Button>
            <span className="w-10 text-right text-[11px] font-semibold text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>
              1:1
            </Button>
            <Button
              size="sm"
              variant={panMode ? "default" : "outline"}
              aria-label={panMode ? "Modo mover ativo" : "Ativar modo mover"}
              onClick={() => setPanMode((v) => !v)}
            >
              {panMode ? <Hand className="size-4" /> : <MousePointer2 className="size-4" />}
            </Button>
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground">
            {panMode
              ? "Modo mover: arraste o documento para navegar. Desative para inserir campos."
              : "Modo edição: toque para inserir campos. Ative a mãozinha para arrastar o documento."}
          </p>
          <div
            ref={scrollRef}
            className="mt-3 max-h-[70vh] overflow-auto rounded-lg border border-border bg-secondary/30"
          >
          <div
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            className={`relative touch-none select-none overflow-hidden bg-white ${
              panMode ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{
              width: `${zoom * 100}%`,
              aspectRatio: current ? `${current.width} / ${current.height}` : "1 / 1.414",
            }}
          >

            {current ? (
              <img
                src={current.url}
                alt={`Página ${page} do documento`}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                {rendering ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Carregando páginas do PDF…
                  </>
                ) : (
                  "Página não disponível para pré-visualização"
                )}
              </div>
            )}

            {fields.map((f) => {
              const signer = signers.find((s) => s.id === f.signer_id);
              const g = ghost?.id === f.id ? ghost : null;
              const box = {
                x: g ? g.x : Number(f.x),
                y: g ? g.y : Number(f.y),
                w: g ? g.w : Number(f.w),
                h: g ? g.h : Number(f.h),
              };
              return (
                <div
                  key={f.id}
                  data-field
                  onPointerDown={(e) => startGesture(e, { id: f.id, ...box }, "move")}
                  className={`absolute flex items-center gap-1 rounded-md border-2 bg-primary/15 px-1 text-[10px] font-semibold text-primary ${
                    selected === f.id ? "border-primary" : "border-primary/50"
                  }`}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                  }}
                >
                  <Move className="size-3 shrink-0" />
                  <span className="truncate">
                    {FIELD_LABEL[f.type as FieldType] ?? f.type}
                    {signer ? ` • ${signer.name.split(" ")[0]}` : ""}
                  </span>
                  <button
                    aria-label="Excluir campo"
                    className="ml-auto shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await supabase.from("signature_fields").delete().eq("id", f.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </button>
                  <span
                    aria-label="Redimensionar"
                    onPointerDown={(e) => startGesture(e, { id: f.id, ...box }, "resize")}
                    className="absolute -bottom-1 -right-1 size-3 cursor-se-resize rounded-sm border border-primary bg-card"
                  />
                </div>
              );
            })}
          </div>
          </div>


          {sel && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <p className="text-[11px] font-semibold">
                Ajuste fino — {FIELD_LABEL[sel.type as FieldType] ?? sel.type}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["◀", { x: clamp(Number(sel.x) - 0.01, 0, 1 - Number(sel.w)) }],
                  ["▶", { x: clamp(Number(sel.x) + 0.01, 0, 1 - Number(sel.w)) }],
                  ["▲", { y: clamp(Number(sel.y) - 0.01, 0, 1 - Number(sel.h)) }],
                  ["▼", { y: clamp(Number(sel.y) + 0.01, 0, 1 - Number(sel.h)) }],
                  ["−", { w: clamp(Number(sel.w) - 0.02, 0.05, 1), h: clamp(Number(sel.h) - 0.005, 0.02, 1) }],
                  ["+", { w: clamp(Number(sel.w) + 0.02, 0.05, 1), h: clamp(Number(sel.h) + 0.005, 0.02, 1) }],
                ].map(([label, patch]) => (
                  <Button
                    key={label as string}
                    size="sm"
                    variant="outline"
                    onClick={() => nudge(sel.id, patch as { x?: number; y?: number; w?: number; h?: number })}
                  >
                    {label as string}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={send}>
          <Send className="mr-2 size-4" /> Enviar para assinatura
        </Button>
      </div>
    </AppShell>
  );
}
