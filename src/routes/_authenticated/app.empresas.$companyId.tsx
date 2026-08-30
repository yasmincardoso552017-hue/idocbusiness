import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderPlus, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, statusClass, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/empresas/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const [folderName, setFolderName] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const [company, docs, contracts, folders, events] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase.from("documents").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("contracts").select("*").eq("company_id", companyId),
        supabase.from("folders").select("*").eq("company_id", companyId).order("name"),
        supabase
          .from("audit_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return {
        company: company.data,
        docs: docs.data ?? [],
        contracts: contracts.data ?? [],
        folders: folders.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const c = data?.company;
  const docs = data?.docs ?? [];
  const docIds = new Set(docs.map((d) => d.id));

  const addFolder = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !folderName) return;
    await supabase.from("folders").insert({ name: folderName, company_id: companyId, owner_id: u.user.id });
    setFolderName("");
    toast.success("Pasta criada");
    refetch();
  };

  const DocList = ({ items }: { items: typeof docs }) => (
    <div className="space-y-2">
      {items.map((d) => (
        <Link
          key={d.id}
          to="/app/documentos"
          search={{ doc: d.id }}
          className="card-soft flex items-center gap-3 p-3"
        >
          <FileText className="size-4 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(d.status)}`}>
            {STATUS_LABEL[d.status] ?? d.status}
          </span>
        </Link>
      ))}
      {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nada por aqui.</p>}
    </div>
  );

  return (
    <AppShell title={c?.nome_fantasia || c?.razao_social || "Empresa"}>
      <div className="card-soft mb-3 p-4">
        <h2 className="text-base font-bold">{c?.razao_social}</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <span>CNPJ: {c?.cnpj || "—"}</span>
          <span>IE: {c?.inscricao_estadual || "—"}</span>
          <span>
            {c?.cidade || "—"}/{c?.estado || "—"}
          </span>
          <span>CEP: {c?.cep || "—"}</span>
          <span>Tel: {c?.telefone || "—"}</span>
          <span className="truncate">E-mail: {c?.email || "—"}</span>
          <span>Contato: {c?.contato || "—"}</span>
          <span>Documentos: {docs.length}</span>
        </div>
        {c?.observacoes && <p className="mt-2 text-xs">{c.observacoes}</p>}
      </div>

      <Tabs defaultValue="docs">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="docs">Documentos</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="signed">Assinados</TabsTrigger>
          <TabsTrigger value="folders">Pastas</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="mt-3">
          <DocList items={docs} />
        </TabsContent>
        <TabsContent value="contracts" className="mt-3">
          <div className="space-y-2">
            {(data?.contracts ?? []).map((k) => (
              <div key={k.id} className="card-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{k.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(k.status)}`}>
                    {STATUS_LABEL[k.status] ?? k.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {k.number || "sem número"} • vence {k.end_date ?? "—"}
                </p>
              </div>
            ))}
            {(data?.contracts ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhum contrato.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="pending" className="mt-3">
          <DocList items={docs.filter((d) => ["draft", "sent", "signing"].includes(d.status))} />
        </TabsContent>
        <TabsContent value="signed" className="mt-3">
          <DocList items={docs.filter((d) => d.status === "signed")} />
        </TabsContent>
        <TabsContent value="folders" className="mt-3">
          <div className="mb-3 flex gap-2">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nova pasta"
            />
            <Button size="icon" onClick={addFolder} aria-label="Criar pasta">
              <FolderPlus className="size-5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(data?.folders ?? []).map((f) => (
              <div key={f.id} className="card-soft p-3 text-xs font-medium">
                {f.name}
                <span className="block text-[10px] text-muted-foreground">
                  {docs.filter((d) => d.folder_id === f.id).length} arquivo(s)
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-3">
          <div className="space-y-2">
            {(data?.events ?? [])
              .filter((e) => !e.document_id || docIds.has(e.document_id))
              .map((e) => (
                <div key={e.id} className="card-soft p-3">
                  <p className="text-xs font-medium">{e.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.actor ?? "sistema"} • {fmtDateTime(e.created_at)} • IP {e.ip ?? "—"}
                  </p>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
