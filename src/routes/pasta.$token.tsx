import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FolderArchive, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { getPublicFolder } from "@/lib/vault.functions";
import { fmtSize } from "@/lib/format";

export const Route = createFileRoute("/pasta/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pasta compartilhada — IDOC BUSINESS" },
      {
        name: "description",
        content: "Acesse e baixe os arquivos de uma pasta compartilhada com segurança no IDOC BUSINESS.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Pasta compartilhada — IDOC BUSINESS" },
      { property: "og:description", content: "Arquivos disponibilizados por link seguro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicFolder,
});

function PublicFolder() {
  const { token } = Route.useParams();
  const [zipping, setZipping] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-folder", token],
    queryFn: () => getPublicFolder({ data: { token } }),
  });

  const error = data && "error" in data ? data.error : null;
  const files = data && "files" in data ? data.files : [];

  async function downloadZip() {
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const root = zip.folder((data as { folder: string }).folder || "pasta")!;
      for (const f of files) {
        if (!f.url) continue;
        const buf = await (await fetch(f.url)).arrayBuffer();
        root.folder(f.folder)!.file(f.name, buf);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data as { folder: string }).folder || "pasta"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  }

  return (
    <PublicPage title={error ? "Pasta indisponível" : `Pasta ${(data as { folder?: string })?.folder ?? ""}`}>
      {isLoading && (
        <p className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando arquivos…
        </p>
      )}
      {error && <p>{error}</p>}
      {!error && !isLoading && (
        <>
          {(data as { company?: string | null })?.company && (
            <p className="text-xs">
              Compartilhado por <strong>{(data as { company?: string | null }).company}</strong>
            </p>
          )}
          <Button className="w-full" disabled={zipping || !files.length} onClick={downloadZip}>
            {zipping ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FolderArchive className="mr-2 size-4" />
            )}
            Baixar pasta em ZIP ({files.length})
          </Button>
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">{f.name}</span>
                  <span className="block text-[10px]">
                    {f.folder} • {fmtSize(f.size)}
                  </span>
                </span>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Baixar ${f.name}`}>
                    <Download className="size-4 text-primary" />
                  </a>
                )}
              </li>
            ))}
            {files.length === 0 && <li>Nenhum arquivo nesta pasta.</li>}
          </ul>
        </>
      )}
    </PublicPage>
  );
}
