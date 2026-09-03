import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Trash2, FileSignature, Pencil, Send } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ContractEnvelopeDialog, StageBadge, STAGE_LABEL } from "@/components/ContractEnvelope";
import { fmtDate, fmtMoney, statusClass, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/contratos")({
  component: Contracts,
});

const empty = {
  id: "",
  name: "",
  number: "",
  type: "servico",
  company_id: "",
  start_date: "",
  end_date: "",
  value: "",
  auto_renew: false,
  notice_days: "30",
  responsible: "",
  notes: "",
  status: "active",
};

function daysTo(d?: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function Contracts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [stage, setStage] = useState("all");
  const [envelope, setEnvelope] = useState<{ id: string; name: string; documentId: string | null } | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["companies-min"],
    queryFn: async () =>
      (await supabase.from("companies").select("id, razao_social, nome_fantasia").order("razao_social")).data ?? [],
  });

  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () =>
      (
        await supabase
          .from("contracts")
          .select("*, companies(razao_social, nome_fantasia)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const list = (contracts ?? []).filter((c) => {
    const okQ =
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.number ?? "").toLowerCase().includes(q.toLowerCase());
    const d = daysTo(c.end_date);
    const effective = d != null && d < 0 ? "expired" : d != null && d <= (c.notice_days ?? 30) ? "expiring" : c.status;
    const okStage = stage === "all" || (c.stage ?? "draft") === stage;
    return okQ && okStage && (status === "all" || effective === status);
  });

  const expiring = (contracts ?? []).filter((c) => {
    const d = daysTo(c.end_date);
    return d != null && d >= 0 && d <= (c.notice_days ?? 30);
  }).length;
  const expired = (contracts ?? []).filter((c) => {
    const d = daysTo(c.end_date);
    return d != null && d < 0;
  }).length;

  async function save() {
    if (!form.name.trim()) { toast.error("Informe o nome do contrato"); return; }
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      owner_id: auth.user!.id,
      company_id: form.company_id || null,
      name: form.name.trim(),
      number: form.number || null,
      type: form.type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      value: form.value ? Number(form.value) : null,
      auto_renew: form.auto_renew,
      notice_days: Number(form.notice_days || 30),
      responsible: form.responsible || null,
      notes: form.notes || null,
      status: form.status,
    };
    const res = form.id
      ? await supabase.from("contracts").update(payload).eq("id", form.id)
      : await supabase.from("contracts").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(form.id ? "Contrato atualizado" : "Contrato criado");
    setOpen(false);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["contracts"] });
  }

  return (
    <AppShell title="Contratos">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Contratos" value={contracts?.length ?? 0} icon={FileSignature} />
          <StatCard label="A vencer" value={expiring} icon={FileSignature} tone="warning" />
          <StatCard label="Vencidos" value={expired} icon={FileSignature} tone="destructive" />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar contrato" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expiring">A vencer</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger>
            <SelectValue placeholder="Estágio do envelope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estágios</SelectItem>
            {["draft", "sent", "delivered", "signed", "completed", "voided", "expired", "declined"].map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABEL[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="w-full"
          onClick={() => {
            setForm(empty);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" /> Novo contrato
        </Button>

        <div className="space-y-2">
          {list.map((c) => {
            const d = daysTo(c.end_date);
            const eff = d != null && d < 0 ? "expired" : d != null && d <= (c.notice_days ?? 30) ? "expiring" : c.status;
            const company = c.companies as { razao_social: string; nome_fantasia: string | null } | null;
            return (
              <div key={c.id} className="card-soft p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {company?.nome_fantasia || company?.razao_social || "Sem empresa"} • {c.number || "s/nº"}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(eff)}`}>
                      {STATUS_LABEL[eff] ?? eff}
                    </span>
                    <StageBadge stage={c.stage ?? "draft"} />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <span>Início: {fmtDate(c.start_date)}</span>
                  <span>Fim: {fmtDate(c.end_date)}</span>
                  <span>Valor: {fmtMoney(c.value)}</span>
                  <span>{c.auto_renew ? "Renovação automática" : `Aviso: ${c.notice_days ?? 30} dias`}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setEnvelope({ id: c.id, name: c.name, documentId: c.document_id ?? null })}
                  >
                    <Send className="mr-1 size-3.5" />
                    {c.request_id ? "Acompanhar" : "Enviar p/ assinar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm({
                        id: c.id,
                        name: c.name,
                        number: c.number ?? "",
                        type: c.type ?? "servico",
                        company_id: c.company_id ?? "",
                        start_date: c.start_date ?? "",
                        end_date: c.end_date ?? "",
                        value: c.value != null ? String(c.value) : "",
                        auto_renew: c.auto_renew,
                        notice_days: String(c.notice_days ?? 30),
                        responsible: c.responsible ?? "",
                        notes: c.notes ?? "",
                        status: c.status,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 size-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Excluir o contrato "${c.name}"?`)) return;
                      const res = await supabase.from("contracts").delete().eq("id", c.id);
                      if (res.error) { toast.error(res.error.message); return; }
                      toast.success("Contrato excluído");
                      qc.invalidateQueries({ queryKey: ["contracts"] });
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum contrato encontrado.</p>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="cn">Nome</Label>
              <Input id="cn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cnum">Número</Label>
              <Input id="cnum" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="fornecimento">Fornecimento</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="trabalho">Trabalho</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cs">Início</Label>
              <Input id="cs" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ce">Fim</Label>
              <Input id="ce" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cv">Valor (R$)</Label>
              <Input id="cv" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cd">Aviso prévio (dias)</Label>
              <Input id="cd" type="number" value={form.notice_days} onChange={(e) => setForm({ ...form, notice_days: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cr">Responsável</Label>
              <Input id="cr" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={form.auto_renew} onCheckedChange={(v) => setForm({ ...form, auto_renew: v })} />
              <span className="text-sm">Renovação automática</span>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="co">Observações</Label>
              <Textarea id="co" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <Button className="mt-2 w-full" onClick={save}>
            Salvar
          </Button>
        </DialogContent>
      </Dialog>

      {envelope ? (
        <ContractEnvelopeDialog
          contractId={envelope.id}
          contractName={envelope.name}
          documentId={envelope.documentId}
          open
          onOpenChange={(v) => {
            if (!v) setEnvelope(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}
