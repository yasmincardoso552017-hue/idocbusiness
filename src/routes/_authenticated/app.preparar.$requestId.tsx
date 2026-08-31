import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Plus, Trash2, Send, GripVertical, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function Prepare() {
  const { requestId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState<FieldType>("signature");
  const [activeSigner, setActiveSigner] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "" });

  const { data } = useQuery({
    queryKey: ["prepare", requestId],
    queryFn: async () => {
      const [req, signers, fields] = await Promise.all([
        supabase
          .from("signing_requests")
          .select("*, documents(id, name, page_count)")
          .eq("id", requestId)
          .single(),
        supabase.from("signers").select("*").eq("request_id", requestId).order("order_index"),
        supabase.from("signature_fields").select("*").eq("request_id", requestId),
      ]);
      return {
        request: req.data,
        signers: signers.data ?? [],
        fields: fields.data ?? [],
      };
    },
  });

  const doc = data?.request?.documents as { id: string; name: string; page_count: number | null } | undefined;
  const pages = doc?.page_count ?? 1;
  const signers = data?.signers ?? [];
  const fields = (data?.fields ?? []).filter((f) => f.page === page);
  const currentSigner = activeSigner || signers[0]?.id || "";

  const refresh = () => qc.invalidateQueries({ queryKey: ["prepare", requestId] });

  async function addSigner() {
    if (!form.name.trim() || !form.email.trim()) return toast.error("Informe nome e e-mail");
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
    if (error) return toast.error(error.message);
    setForm({ name: "", email: "", phone: "", cpf: "" });
    refresh();
  }

  async function removeSigner(id: string) {
    await supabase.from("signature_fields").delete().eq("signer_id", id);
    await supabase.from("signers").delete().eq("id", id);
    refresh();
  }

  async function addFieldAt(xRatio: number, yRatio: number) {
    if (!currentSigner) return toast.error("Adicione um signatário primeiro");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("signature_fields").insert({
      request_id: requestId,
      signer_id: currentSigner,
      owner_id: auth.user!.id,
      page,
      x: Math.min(0.9, Math.max(0, xRatio)),
      y: Math.min(0.94, Math.max(0, yRatio)),
      w: activeType === "signature" ? 0.3 : 0.22,
      h: activeType === "signature" ? 0.07 : 0.04,
      type: activeType,
    });
    if (error) return toast.error(error.message);
    refresh();
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (dragId) return;
    const box = canvasRef.current!.getBoundingClientRect();
    addFieldAt((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
  }

  async function moveField(id: string, clientX: number, clientY: number) {
    const box = canvasRef.current!.getBoundingClientRect();
    const x = Math.min(0.92, Math.max(0, (clientX - box.left) / box.width));
    const y = Math.min(0.95, Math.max(0, (clientY - box.top) / box.height));
    await supabase.from("signature_fields").update({ x, y }).eq("id", id);
    refresh();
  }

  async function send() {
    try {
      const res = await dispatchSigningRequest({ data: { requestId } });
      const links = Object.entries(res.links);
      await navigator.clipboard?.writeText(links.map(([e, l]) => `${e}: ${l}`).join("\n")).catch(() => null);
      toast.success("Enviado para assinatura. Links copiados.");
      navigate({ to: "/app/assinaturas" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

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
            <div className="flex-1 min-w-[200px]">
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
              <Input id="se" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
          <h2 className="text-sm font-bold">Posicionar campos</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Toque na página para inserir o campo e arraste para ajustar a posição.
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
              Página {page} de {pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div
            ref={canvasRef}
            onClick={onCanvasClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) {
                moveField(dragId, e.clientX, e.clientY);
                setDragId(null);
              }
            }}
            className="relative mt-3 w-full overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40"
            style={{ aspectRatio: "1 / 1.414" }}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
              Área da página {page}
            </div>
            {fields.map((f) => {
              const signer = signers.find((s) => s.id === f.signer_id);
              return (
                <div
                  key={f.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragId(f.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute flex items-center gap-1 rounded-md border border-primary/60 bg-primary/15 px-1 text-[10px] font-semibold text-primary"
                  style={{
                    left: `${Number(f.x) * 100}%`,
                    top: `${Number(f.y) * 100}%`,
                    width: `${Number(f.w) * 100}%`,
                    height: `${Number(f.h) * 100}%`,
                  }}
                >
                  <GripVertical className="size-3 shrink-0" />
                  <span className="truncate">
                    {FIELD_LABEL[f.type as FieldType] ?? f.type}
                    {signer ? ` • ${signer.name.split(" ")[0]}` : ""}
                  </span>
                  <button
                    aria-label="Excluir campo"
                    className="ml-auto shrink-0"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await supabase.from("signature_fields").delete().eq("id", f.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={send}>
          <Send className="mr-2 size-4" /> Enviar para assinatura
        </Button>
      </div>
    </AppShell>
  );
}
