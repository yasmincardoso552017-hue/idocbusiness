export const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  sent: "Aguardando assinatura",
  signing: "Em assinatura",
  partially_signed: "Parcialmente assinado",
  signed: "Assinado",
  completed: "Concluído",
  active: "Ativo",
  expiring: "Próximo do vencimento",
  expired: "Expirado",
  archived: "Arquivado",
  cancelled: "Cancelado",
  viewed: "Visualizado",
  failed: "Falha",
};

export function statusClass(status: string) {
  switch (status) {
    case "signed":
    case "completed":
    case "active":
      return "bg-success/12 text-success border-success/30";
    case "expired":
    case "cancelled":
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "expiring":
      return "bg-warning/15 text-warning-foreground border-warning/40";
    case "signing":
    case "sent":
    case "partially_signed":
    case "viewed":
      return "bg-primary/10 text-primary border-primary/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";
export const fmtMoney = (v?: number | string | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtSize = (b?: number | null) =>
  b == null ? "—" : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
