import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Download, Plus, Send, Trash2, Ban, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  getContractEnvelope,
  resendContractEnvelope,
  sendContractEnvelope,
  voidContractEnvelope,
} from "@/lib/contracts.functions";
import { fmtDateTime } from "@/lib/format";

const STAGE_FLOW = ["draft", "sent", "delivered", "signed", "completed"] as const;
export const STAGE_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  delivered: "Entregue/visualizado",
  signed: "Assinado",
  completed: "Concluído",
  voided: "Cancelado",
  expired: "Expirado",
  declined: "Recusado",
  resent: "Reenviado",
};

export function StageBadge({ stage }: { stage: string }) {
  const tone =
    stage === "completed" || stage === "signed"
      ? "bg-success/12 text-success border-success/30"
      : stage === "voided" || stage === "expired" || stage === "declined"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : stage === "draft"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-primary/10 text-primary border-primary/25";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {STAGE_LABEL[stage] ?? stage}
    </span>
  );
}

function StageTrack({ stage }: { stage: string }) {
  const broken = ["voided", "expired", "declined"].includes(stage);
  const idx = STAGE_FLOW.indexOf(stage as (typeof STAGE_FLOW)[number]);
  return (
    <div className="flex items-center gap-1">
      {STAGE_FLOW.map((s, i) => (
        <div key={s} className="flex-1">
          <div
            className={`h-1.5 rounded-full ${
              broken ? "bg-destructive/40" : i <= idx ? "bg-primary" : "bg-muted"
            }`}
          />
          <span className="mt-1 block text-[9px] leading-tight text-muted-foreground">
            {STAGE_LABEL[s]}
          </span>
        </div>
      ))}
    </div>
  );
}

type SignerDraft = {
  name: string;
  email: string;
  cpf: string;
  requireGeo?: boolean;
  requirePhotoId?: boolean;
  requireSelfie?: boolean;
};

export function ContractEnvelopeDialog({
  contractId,
  contractName,
  documentId,
  open,
  onOpenChange,
}: {
  contractId: string;
  contractName: string;
  documentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [docId, setDocId] = useState(documentId ?? "");
  const [mode, setMode] = useState<"sequential" | "parallel">("sequential");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState("15");
  const [geo, setGeo] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [selfie, setSelfie] = useState(false);
  const [signers, setSigners] = useState<SignerDraft[]>([{ name: "", email: "", cpf: "" }]);

  const envelope = useQuery({
    queryKey: ["contract-envelope", contractId],
    queryFn: () => getContractEnvelope({ data: { contractId } }),
    enabled: open,
    refetchInterval: open ? 20000 : false,
  });

  const documents = useQuery({
    queryKey: ["docs-min"],
    queryFn: async () =>
      (
        await supabase
          .from("documents")
          .select("id, name, page_count, status")
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
    enabled: open,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!docId) throw new Error("Selecione o documento (PDF) do contrato");
      const clean = signers
        .map((s) => ({
          name: s.name.trim(),
          email: s.email.trim(),
          cpf: s.cpf.trim() || undefined,
          requireGeo: s.requireGeo ?? geo,
          requirePhotoId: s.requirePhotoId ?? photo,
          requireSelfie: s.requireSelfie ?? selfie,
        }))
        .filter((s) => s.name && s.email);
      if (!clean.length) throw new Error("Informe ao menos um signatário");
      return sendContractEnvelope({
        data: {
          contractId,
          documentId: docId,
          mode,
          message: message.trim() || undefined,
          expiresInDays: days ? Number(days) : undefined,
          requireGeo: geo,
          requirePhotoId: photo,
          requireSelfie: selfie,
          signers: clean,
        },
      });
    },
    onSuccess: () => {
      toast.success("Envelope enviado — links gerados");
      qc.invalidateQueries({ queryKey: ["contract-envelope", contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const voidIt = useMutation({
    mutationFn: () => voidContractEnvelope({ data: { contractId } }),
    onSuccess: () => {
      toast.success("Envelope cancelado");
      qc.invalidateQueries({ queryKey: ["contract-envelope", contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: () => resendContractEnvelope({ data: { contractId } }),
    onSuccess: () => {
      toast.success("Links renovados");
      qc.invalidateQueries({ queryKey: ["contract-envelope", contractId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const env = envelope.data;
  const hasEnvelope = !!env?.request;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Envelope • {contractName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="card-soft space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Ciclo do contrato</span>
              <StageBadge stage={env?.stage ?? "draft"} />
            </div>
            <StageTrack stage={env?.stage ?? "draft"} />
          </div>

          {!hasEnvelope ? (
            <section className="space-y-3">
              <div>
                <Label className="text-xs">Documento para assinatura</Label>
                <Select value={docId} onValueChange={setDocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o PDF" />
                  </SelectTrigger>
                  <SelectContent>
                    {(documents.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Ordem</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as "sequential" | "parallel")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequencial</SelectItem>
                      <SelectItem value="parallel">Paralelo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Expira em (dias)</Label>
                  <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Signatários (destinatários)</Label>
                {signers.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder="Nome"
                      value={s.name}
                      onChange={(e) =>
                        setSigners((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                    />
                    <Input
                      placeholder="E-mail"
                      value={s.email}
                      onChange={(e) =>
                        setSigners((p) => p.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSigners((p) => p.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSigners((p) => [...p, { name: "", email: "", cpf: "" }])}
                >
                  <Plus className="mr-1 size-3.5" /> Adicionar signatário
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <span className="text-xs font-bold">Autenticação e provas</span>
                {[
                  ["Solicitar localização", geo, setGeo],
                  ["Documento com foto", photo, setPhoto],
                  ["Selfie do signatário", selfie, setSelfie],
                ].map(([label, value, set]) => (
                  <label key={label as string} className="flex items-center gap-2 text-xs">
                    <Switch
                      checked={value as boolean}
                      onCheckedChange={set as (v: boolean) => void}
                    />
                    {label as string}
                  </label>
                ))}
              </div>

              <div>
                <Label className="text-xs">Mensagem ao signatário</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
              </div>

              <Button className="w-full" disabled={send.isPending} onClick={() => send.mutate()}>
                <Send className="mr-1 size-4" />
                {send.isPending ? "Enviando…" : "Enviar para assinatura"}
              </Button>
            </section>
          ) : (
            <section className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                {env?.document?.name} • {env?.signers.filter((s) => s.status === "signed").length}/
                {env?.signers.length} assinaturas •{" "}
                {env?.request?.mode === "sequential" ? "Sequencial" : "Paralelo"}
                {env?.request?.expires_at ? ` • expira ${fmtDateTime(env.request.expires_at)}` : ""}
              </div>

              <div className="space-y-2">
                {(env?.signers ?? []).map((s) => (
                  <div key={s.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`size-2 rounded-full ${
                          s.status === "signed" ? "bg-success" : s.revoked ? "bg-destructive" : "bg-warning"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {s.order_index}. {s.name}
                      </span>
                      {s.status !== "signed" && !s.revoked ? (
                        <button
                          aria-label="Copiar link"
                          onClick={() => {
                            navigator.clipboard?.writeText(`${window.location.origin}/sign/${s.token}`);
                            toast.success("Link copiado");
                          }}
                        >
                          <Copy className="size-3.5 text-primary" />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                      <span className="truncate">{s.email}</span>
                      <span>Visto: {fmtDateTime(s.viewed_at)}</span>
                      <span>Assinado: {fmtDateTime(s.signed_at)}</span>
                      <span className="truncate">
                        {s.device ?? "—"} {s.ip ? `• ${s.ip}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {env?.evidence ? (
                <div className="card-soft space-y-1 p-3 text-[11px]">
                  <div className="flex items-center gap-1 font-bold">
                    <ShieldCheck className="size-3.5 text-success" /> Evidências
                  </div>
                  <div>Código de verificação: {env.evidence.verification_code}</div>
                  <div className="break-all">Hash final: {env.evidence.final_hash}</div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {env?.signedUrl ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={env.signedUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-1 size-3.5" /> Via assinada
                    </a>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate()}>
                  <RefreshCw className="mr-1 size-3.5" /> Reenviar links
                </Button>
                {env?.stage !== "completed" && env?.stage !== "voided" ? (
                  <Button size="sm" variant="ghost" disabled={voidIt.isPending} onClick={() => voidIt.mutate()}>
                    <Ban className="mr-1 size-3.5 text-destructive" /> Cancelar envelope
                  </Button>
                ) : null}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold">Trilha de eventos</span>
                {(env?.events ?? []).map((e) => (
                  <div key={e.id} className="flex gap-2 text-[10px] text-muted-foreground">
                    <span className="whitespace-nowrap">{fmtDateTime(e.occurred_at)}</span>
                    <span className="min-w-0 flex-1">{e.message ?? e.event_type}</span>
                  </div>
                ))}
                {(env?.events ?? []).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">Sem eventos registrados.</p>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
