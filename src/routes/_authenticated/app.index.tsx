import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  PenLine,
  CalendarClock,
  Activity,
  BellRing,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";

import { AppShell, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, statusClass, STATUS_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PushSetup } from "@/components/PushSetup";
import { fmtDateTime as fmtDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Painel — documentos, contratos e ferramentas de PDF | IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Acompanhe empresas, documentos, contratos e assinaturas, e acesse as ferramentas de PDF: organizar, converter, editar, assinar, proteger, comprimir e OCR.",
      },
      { property: "og:title", content: "Painel IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Visão geral do seu escritório digital: documentos, contratos, assinaturas e ferramentas de PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TOOL_GROUPS = [
  { icon: Layers, label: "Organizar PDFs", desc: "Juntar, dividir, extrair, reordenar, excluir e girar páginas" },
  { icon: RefreshCw, label: "Converter", desc: "Word, Excel, PowerPoint, JPG, HTML e PDF/A" },
  { icon: PencilRuler, label: "Editar", desc: "Textos, imagens, formas, desenho, destaques e formulários" },
  { icon: PenLine, label: "Assinatura", desc: "Assinar e solicitar assinaturas com campos posicionados" },
  { icon: ShieldCheck, label: "Segurança", desc: "Senha, criptografia e redação de dados sensíveis" },
  { icon: Gauge, label: "Otimização", desc: "Comprimir para enviar por e-mail e WhatsApp" },
  { icon: ScanText, label: "OCR", desc: "PDF pesquisável e extração de texto de digitalizações" },
] as const;


function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [companies, docs, contracts, signers, events, reminders, notes] = await Promise.all([
        supabase.from("companies").select("id"),
        supabase.from("documents").select("id, name, status, created_at, company_id"),
        supabase.from("contracts").select("id, name, status, end_date"),
        supabase.from("signers").select("id, status, name, request_id"),
        supabase
          .from("audit_events")
          .select("id, action, actor, created_at")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("reminders")
          .select("id, title, body, due_at, status, target_email")
          .eq("status", "pending")
          .order("due_at")
          .limit(6),
        supabase
          .from("notifications")
          .select("id, title, body, created_at, read")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      return {
        companies: companies.data ?? [],
        docs: docs.data ?? [],
        contracts: contracts.data ?? [],
        signers: signers.data ?? [],
        events: events.data ?? [],
        reminders: reminders.data ?? [],
        notes: notes.data ?? [],
      };
    },
  });

  const docs = data?.docs ?? [];
  const contracts = data?.contracts ?? [];
  const soon = contracts.filter((c) => {
    if (!c.end_date) return false;
    const days = (new Date(c.end_date).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 30;
  });
  const expired = contracts.filter((c) => c.end_date && new Date(c.end_date) < new Date());
  const pending = docs.filter((d) => d.status === "sent" || d.status === "signing" || d.status === "draft");
  const signed = docs.filter((d) => d.status === "signed");
  const chart = [
    { name: "Rascunho", v: docs.filter((d) => d.status === "draft").length },
    { name: "Em assin.", v: docs.filter((d) => d.status === "signing" || d.status === "sent").length },
    { name: "Assinados", v: signed.length },
    { name: "Arquiv.", v: docs.filter((d) => d.status === "archived").length },
  ];
  const colors = ["oklch(0.53 0.025 255)", "oklch(0.42 0.1 250)", "oklch(0.6 0.13 155)", "oklch(0.72 0.12 190)"];

  const alerts = [
    ...soon.map((c) => ({ tone: "warning", text: `Contrato "${c.name}" vence em breve` })),
    ...expired.map((c) => ({ tone: "destructive", text: `Contrato "${c.name}" expirado` })),
    ...docs
      .filter((d) => d.status === "signing")
      .map((d) => ({ tone: "primary", text: `"${d.name}" parcialmente assinado` })),
    ...docs
      .filter((d) => d.status === "sent")
      .map((d) => ({ tone: "primary", text: `"${d.name}" aguardando assinatura` })),
  ].slice(0, 5);

  return (
    <AppShell title="Visão geral">
      <div className="card-soft gradient-brand mb-4 p-4 text-primary-foreground">
        <p className="text-xs opacity-90">Fluxo principal</p>
        <p className="mt-1 text-base font-bold leading-snug">
          Cadastre a empresa, envie o documento e colete assinaturas com trilha de auditoria.
        </p>
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/app/empresas">Enviar documento</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="bg-transparent text-primary-foreground">
            <Link to="/app/empresas">Nova empresa</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Empresas" value={data?.companies.length ?? 0} icon={Building2} />
        <StatCard label="Documentos" value={docs.length} icon={FileText} />
        <StatCard label="Pendentes de assinatura" value={pending.length} icon={Clock} tone="warning" />
        <StatCard label="Documentos assinados" value={signed.length} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Documentos expirados"
          value={docs.filter((d) => d.status === "expired").length}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard
          label="Contratos ativos"
          value={contracts.filter((c) => c.status === "active").length}
          icon={FileSignature}
        />
        <StatCard label="Contratos a vencer" value={soon.length} icon={CalendarClock} tone="warning" />
        <StatCard
          label="Assinaturas pendentes"
          value={(data?.signers ?? []).filter((s) => s.status !== "signed").length}
          icon={PenLine}
        />
        <StatCard label="Contratos expirados" value={expired.length} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="mb-3 text-sm font-bold">Documentos por status</h2>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="v" radius={6}>
                {chart.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card-soft mt-4 p-4">
          <h2 className="mb-2 text-sm font-bold">Alertas</h2>
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2 text-xs ${statusClass(
                  a.tone === "warning" ? "expiring" : a.tone === "destructive" ? "expired" : "signing",
                )}`}
              >
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-soft mt-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-bold">
            <BellRing className="size-4 text-primary" /> Lembretes e notificações
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/lembretes">Gerenciar</Link>
          </Button>
        </div>
        <PushSetup className="mt-3 w-full" />
        <ul className="mt-3 space-y-2">
          {(data?.reminders ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs font-semibold">{r.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {fmtDT(r.due_at)}
                {r.target_email ? ` • ${r.target_email}` : " • você"}
              </p>
            </li>
          ))}
          {(data?.notes ?? []).map((n) => (
            <li key={n.id} className="rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-xs font-semibold">{n.title}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDT(n.created_at)}</p>
            </li>
          ))}
          {(data?.reminders ?? []).length === 0 && (data?.notes ?? []).length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhum lembrete agendado.</li>
          )}
        </ul>
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Activity className="size-4 text-primary" /> Atividades recentes
        </h2>
        {(data?.events ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        )}
        <ul className="space-y-3">
          {(data?.events ?? []).map((e) => (
            <li key={e.id} className="border-b border-border pb-2 last:border-0">
              <p className="text-xs font-medium">{e.action}</p>
              <p className="text-[11px] text-muted-foreground">
                {e.actor ?? "sistema"} • {fmtDateTime(e.created_at)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="mb-3 text-sm font-bold">Últimos documentos</h2>
        <ul className="space-y-2">
          {docs.slice(0, 5).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{d.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(d.status)}`}>
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
            </li>
          ))}
          {docs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum documento ainda.</p>}
        </ul>
      </div>
    </AppShell>
  );
}
