import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PenLine, Copy, Download, Ban, BadgeCheck, Send } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, statusClass, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/assinaturas")({
  component: Signatures,
});

function Signatures() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("signing_requests")
        .select("*, documents(id, name, status, signed_storage_path)")
        .order("created_at", { ascending: false });
      const ids = (reqs ?? []).map((r) => r.id);
      const { data: signers } = ids.length
        ? await supabase.from("signers").select("*").in("request_id", ids).order("order_index")
        : { data: [] };
      const { data: evidence } = ids.length
        ? await supabase.from("document_evidence").select("*").in("request_id", ids)
        : { data: [] };
      return { reqs: reqs ?? [], signers: signers ?? [], evidence: evidence ?? [] };
    },
  });

  const reqs = (data?.reqs ?? []).filter((r) => {
    const doc = r.documents as { name: string } | null;
    return !q || (doc?.name ?? "").toLowerCase().includes(q.toLowerCase());
  });

  const pending = (data?.reqs ?? []).filter((r) => ["sent", "partially_signed"].includes(r.status)).length;
  const done = (data?.reqs ?? []).filter((r) => r.status === "completed").length;

  async function download(path: string, name: string) {
    const { data: file, error } = await supabase.storage.from("documents").download(path);
    if (error || !file) { toast.error("Não foi possível baixar o arquivo"); return; }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Assinaturas">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Processos" value={data?.reqs.length ?? 0} icon={PenLine} />
          <StatCard label="Aguardando" value={pending} icon={Send} tone="warning" />
          <StatCard label="Concluídos" value={done} icon={BadgeCheck} tone="success" />
        </div>

        <Input placeholder="Buscar documento" value={q} onChange={(e) => setQ(e.target.value)} />

        <div className="space-y-3">
          {reqs.map((r) => {
            const doc = r.documents as {
              id: string;
              name: string;
              status: string;
              signed_storage_path: string | null;
            } | null;
            const signers = (data?.signers ?? []).filter((s) => s.request_id === r.id);
            const ev = (data?.evidence ?? []).find((e) => e.request_id === r.id);
            const signed = signers.filter((s) => s.status === "signed").length;
            return (
              <div key={r.id} className="card-soft p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{doc?.name ?? "Documento"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {signed}/{signers.length} assinaturas • {r.mode === "sequential" ? "Sequencial" : "Paralelo"} •{" "}
                      {fmtDateTime(r.created_at)}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(r.status)}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {signers.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-[11px]">
                      <span className={`size-2 rounded-full ${s.status === "signed" ? "bg-success" : s.revoked ? "bg-destructive" : "bg-warning"}`} />
                      <span className="min-w-0 flex-1 truncate">
                        {s.order_index}. {s.name} — {s.email}
                      </span>
                      <span className="text-muted-foreground">{STATUS_LABEL[s.status] ?? s.status}</span>
                      {s.status !== "signed" && (
                        <>
                          <button
                            aria-label="Copiar link"
                            onClick={() => {
                              navigator.clipboard?.writeText(`${window.location.origin}/sign/${s.token}`);
                              toast.success("Link copiado");
                            }}
                          >
                            <Copy className="size-3.5 text-primary" />
                          </button>
                          <button
                            aria-label="Revogar"
                            onClick={async () => {
                              await supabase.from("signers").update({ revoked: !s.revoked }).eq("id", s.id);
                              qc.invalidateQueries({ queryKey: ["requests"] });
                            }}
                          >
                            <Ban className="size-3.5 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "draft" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/app/preparar/$requestId" params={{ requestId: r.id }}>
                        Preparar e enviar
                      </Link>
                    </Button>
                  )}
                  {doc?.signed_storage_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => download(doc.signed_storage_path!, `assinado-${doc.name}`)}
                    >
                      <Download className="mr-1 size-3.5" /> PDF assinado
                    </Button>
                  )}
                  {ev && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/verify" search={{ code: ev.verification_code }}>
                        <BadgeCheck className="mr-1 size-3.5" /> {ev.verification_code}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {reqs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum processo de assinatura. Envie um documento em Docs.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
