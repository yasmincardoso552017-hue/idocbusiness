import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Download, Eye, Plus, Send, Trash2, Ban, RefreshCw, ShieldCheck, MessageCircle, Mail } from "lucide-react";
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
  getContractFileUrl,
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
  phone: string;
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
  const [signers, setSigners] = useState<SignerDraft[]>([{ name: "", email: "", phone: "", cpf: "" }]);
  const [deliveryLinks, setDeliveryLinks] = useState<Array<{ name: string; email: string; phone: string | null; url: string }>>([]);

  const openContractFile = async (download: boolean) => {
    const previewWindow = download ? null : window.open("", "_blank");
    try {
      const result = await getContractFileUrl({ data: { contractId, download } });
      if (download) {
        window.location.assign(result.url);
      } else if (previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.href = result.url;
      } else {
        window.location.assign(result.url);
      }
    } catch (error) {
      previewWindow?.close();
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o contrato");
    }
  };

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
          phone: s.phone.trim() || undefined,
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
    onSuccess: (result) => {
      setDeliveryLinks(result.links);
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
    onSuccess: (result) => {
      setDeliveryLinks(result.links);
      toast.success("Links renovados");
      qc.invalidateQueries({ queryKey: ["contract-envelope", contractId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const env = envelope.data;
  const hasEnvelope = !!env?.request;
  const availableLinks = deliveryLinks.length
    ? deliveryLinks
    : (env?.signers ?? [])
        .filter((s) => s.status !== "signed" && !s.revoked)
        .map((s) => ({
          name: s.name,
          email: s.email,
          phone: s.phone,
          url: `${typeof window === "undefined" ? "" : window.location.origin}/sign/${s.token}`,
        }));

  function whatsappUrl(item: { name: string; phone: string | null; url: string }) {
    const phone = (item.phone ?? "").replace(/\D/g, "");
    const text = `Olá, ${item.name}! Você recebeu um documento para assinatura no IDOC BUSINESS. Acesse seu link exclusivo: ${item.url}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

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
                  <div key={i} className="space-y-2 rounded-lg border border-border p-2">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
                    <Input
                      inputMode="tel"
                      placeholder="WhatsApp com DDD (opcional)"
                      value={s.phone}
                      onChange={(e) =>
                        setSigners((p) => p.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                      }
                    />
                    <div className="grid gap-1 sm:grid-cols-3">
                      {(
                        [
                          ["requireGeo", "Localização", geo],
                          ["requirePhotoId", "Documento com foto", photo],
                          ["requireSelfie", "Selfie", selfie],
                        ] as const
                      ).map(([key, label, fallback]) => (
                        <label key={key} className="flex items-center gap-2 text-[11px]">
                          <Switch
                            checked={s[key] ?? fallback}
                            onCheckedChange={(v) =>
                              setSigners((p) => p.map((x, j) => (j === i ? { ...x, [key]: v } : x)))
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSigners((p) => [...p, { name: "", email: "", phone: "", cpf: "" }])}
                >
                  <Plus className="mr-1 size-3.5" /> Adicionar signatário
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <span className="text-xs font-bold">Padrão para novos signatários</span>
                <p className="text-[11px] text-muted-foreground">
                  Vale para quem você não marcar individualmente acima.
                </p>
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
                {env?.document ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void openContractFile(false)}>
                      <Eye className="mr-1 size-3.5" /> Ver contrato
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void openContractFile(true)}>
                      <Download className="mr-1 size-3.5" /> Baixar PDF
                    </Button>
                  </>
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

              {availableLinks.length ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div>
                    <span className="text-xs font-bold">Enviar links aos signatários</span>
                    <p className="text-[10px] text-muted-foreground">Cada pessoa recebe somente o próprio link.</p>
                  </div>
                  {availableLinks.map((item) => (
                    <div key={item.email} className="flex flex-col gap-2 rounded-md bg-muted p-2 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{item.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{item.email}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!item.phone}
                          asChild={Boolean(item.phone)}
                        >
                          {item.phone ? (
                            <a href={whatsappUrl(item)} target="_blank" rel="noreferrer">
                              <MessageCircle className="mr-1 size-3.5" /> WhatsApp
                            </a>
                          ) : (
                            <span><MessageCircle className="mr-1 size-3.5" /> Sem número</span>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info("Conecte Gmail ou Outlook em Perfil → Canais de envio.")}
                        >
                          <Mail className="mr-1 size-3.5" /> E-mail
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Copiar link de ${item.name}`}
                          onClick={() => {
                            navigator.clipboard?.writeText(item.url);
                            toast.success("Link copiado");
                          }}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

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
