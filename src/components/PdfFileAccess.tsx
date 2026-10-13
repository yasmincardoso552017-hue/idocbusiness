import { useEffect, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";

type ResolveFile = (download: boolean) => Promise<{ url: string | null }>;

function PdfFileViewer({ url, name, close, download }: { url: string; name: string; close: () => void; download: () => void }) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar o PDF. Tente abrir novamente.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        let total = 0;
        const rendered = await renderPdfPages(bytes, 1000, (_, count) => { total = count; });
        if (!active) return;
        if (rendered.length !== total) throw new Error("A prévia está incompleta. Baixe o PDF original para consultar todas as páginas.");
        setPages(rendered);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível exibir a prévia. Você ainda pode baixar o arquivo.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [url]);
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl flex-col p-3 sm:p-5">
      <DialogHeader className="min-w-0 pr-8">
        <DialogTitle className="break-words text-base">{name}</DialogTitle>
        <DialogDescription>Prévia do PDF • {pages.length || "…"} página(s)</DialogDescription>
      </DialogHeader>
      <Button variant="outline" size="sm" className="self-start" onClick={download}><Download className="mr-2 size-4" />Baixar PDF</Button>
      <div className="min-h-0 overflow-auto bg-muted p-2" aria-busy={loading}>
        {loading && <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm"><Loader2 className="size-4 animate-spin" />Carregando PDF…</p>}
        {error && <p role="alert" className="py-8 text-sm text-destructive">{error}</p>}
        {pages.map((page) => <img key={page.index} src={page.url} width={page.width} height={page.height} className="mx-auto mb-3 h-auto w-full" alt={`Página ${page.index + 1}`} />)}
      </div>
    </DialogContent>
  </Dialog>;
}

export function usePdfFileAccess() {
  const [preview, setPreview] = useState<{ url: string; name: string; resolve: ResolveFile } | null>(null);
  const [busy, setBusy] = useState(false);
  async function openFile(resolve: ResolveFile, name: string, download = false) {
    setBusy(true);
    try {
      const result = await resolve(download);
      if (!result.url) throw new Error("O PDF ainda não está disponível.");
      if (download) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else setPreview({ url: result.url, name, resolve });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o PDF.");
    } finally { setBusy(false); }
  }
  return { busy, openFile, viewer: preview ? <PdfFileViewer key={preview.url} url={preview.url} name={preview.name} close={() => setPreview(null)} download={() => void openFile(preview.resolve, preview.name, true)} /> : null };
}

export function SignedPdfActions({ resolve, name }: { resolve: ResolveFile; name: string }) {
  const access = usePdfFileAccess();
  return <>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={access.busy} onClick={() => void access.openFile(resolve, name)}><Eye className="mr-1 size-4" />Ver PDF assinado</Button>
      <Button size="sm" disabled={access.busy} onClick={() => void access.openFile(resolve, name, true)}><Download className="mr-1 size-4" />Baixar PDF</Button>
    </div>
    {access.viewer}
  </>;
}