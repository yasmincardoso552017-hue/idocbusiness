import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getMySignedDocumentUrl, myClaimedDocuments } from "@/lib/signing.functions";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/meus-contratos")({
  head: () => ({
    meta: [
      { title: "Meus contratos assinados — IDOC BUSINESS" },
      {
        name: "description",
        content: "Acesse e baixe em PDF os contratos que você assinou eletronicamente.",
      },
      { property: "og:title", content: "Meus contratos assinados — IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Suas vias assinadas em PDF, com código de verificação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyContracts,
});

function MyContracts() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-claimed-docs"],
    queryFn: () => myClaimedDocuments(),
  });

  const items = data?.items ?? [];

  const openSignedDocument = async (documentId: string, download: boolean) => {
    const previewWindow = download ? null : window.open("", "_blank");
    try {
      const result = await getMySignedDocumentUrl({ data: { documentId, download } });
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
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a via assinada");
    }
  };

  return (
    <AppShell title="Meus contratos">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Aqui ficam apenas os contratos que você assinou, vinculados à sua conta.
        </p>

        {isLoading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando seus contratos…
          </p>
        ) : null}

        {items.map((d) => (
          <div key={d.id} className="card-soft space-y-2 p-3">
            <div className="flex items-start gap-2">
              <FileCheck2 className="mt-0.5 size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{d.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Assinado em {d.signedAt ? fmtDateTime(d.signedAt) : "—"}
                  {d.code ? ` • Código ${d.code}` : ""}
                </div>
              </div>
            </div>
            {d.url ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void openSignedDocument(d.id, false)}>
                  <Eye className="mr-1 size-3.5" /> Ver contrato
                </Button>
                <Button size="sm" variant="outline" onClick={() => void openSignedDocument(d.id, true)}>
                  <Download className="mr-1 size-3.5" /> Baixar PDF
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Aguardando as demais assinaturas para gerar o PDF final.
              </p>
            )}
          </div>
        ))}

        {!isLoading && !items.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não tem contratos assinados nesta conta.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
