import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Download, Lock, FileClock } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança e LGPD — IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Auditoria imutável, evidências de assinatura e controles de privacidade (LGPD) da sua conta IDOC BUSINESS.",
      },
      { property: "og:title", content: "Segurança e LGPD — IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Trilha de auditoria imutável e controles de privacidade no IDOC BUSINESS.",
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const [q, setQ] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtered = events.filter((e) =>
    `${e.action} ${e.actor ?? ""} ${e.ip ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  function exportAudit() {
    const rows = [
      ["data", "acao", "ator", "ip", "documento", "user_agent"],
      ...filtered.map((e) => [
        e.created_at,
        e.action,
        e.actor ?? "",
        e.ip ?? "",
        e.document_id ?? "",
        (e.user_agent ?? "").replace(/[,\n]/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "docflow-auditoria.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Auditoria exportada");
  }

  return (
    <AppShell title="Segurança e LGPD">
      <div className="space-y-4">
        <div className="card-soft space-y-2 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="text-sm font-bold">Proteções ativas</h2>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Armazenamento privado: arquivos acessíveis apenas por links temporários assinados.</li>
            <li>• Isolamento multiempresa por usuário proprietário (RLS no banco de dados).</li>
            <li>• Auditoria imutável: eventos somente leitura, sem edição ou exclusão.</li>
            <li>• Hash SHA-256 do arquivo original e do PDF final assinado.</li>
            <li>• Evidências de assinatura: IP, dispositivo, data/hora, aceite de termos e geolocalização opcional.</li>
            <li>• Verificação pública por código, sem expor dados pessoais completos.</li>
          </ul>
        </div>

        <div className="card-soft space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <h2 className="text-sm font-bold">Privacidade e LGPD</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Tratamos dados pessoais para execução do contrato de assinatura eletrônica e cumprimento de
            obrigação legal de comprovação. Você é o controlador dos documentos enviados; o IDOC BUSINESS atua como
            operador. Titulares podem solicitar acesso, correção ou eliminação — exceto dados necessários à
            validade jurídica das assinaturas já concluídas, retidos pelo prazo legal.
          </p>
          <Button variant="outline" size="sm" onClick={exportAudit}>
            <Download className="mr-2 size-4" /> Exportar auditoria (CSV)
          </Button>
        </div>

        <div className="card-soft p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileClock className="size-5 text-primary" />
            <h2 className="flex-1 text-sm font-bold">Trilha de auditoria</h2>
            <span className="text-xs text-muted-foreground">{filtered.length}</span>
          </div>
          <Input
            placeholder="Buscar por ação, ator ou IP"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-3"
          />
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <li key={e.id} className="py-2">
                  <p className="text-xs font-semibold">{e.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDateTime(e.created_at)}
                    {e.actor ? ` • ${e.actor}` : ""}
                    {e.ip ? ` • IP ${e.ip}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
