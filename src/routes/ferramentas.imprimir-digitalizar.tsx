import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PdfTools } from "@/components/PdfTools";
import { PrintScanConnector } from "@/components/PrintScanConnector";
import { PublicSiteLayout } from "@/components/PublicSiteChrome";

export const Route = createFileRoute("/ferramentas/imprimir-digitalizar")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Imprimir e digitalizar documentos | IDOC BUSINESS" },
    { name: "description", content: "Use impressoras e scanners do Windows e abra digitalizações diretamente nas ferramentas de documentos." },
    { property: "og:title", content: "Imprimir e digitalizar | IDOC BUSINESS" },
    { property: "og:description", content: "Central segura para impressão e digitalização de documentos no Windows." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PrintAndScanPage,
});

function PrintAndScanPage() {
  const [scanned, setScanned] = useState<File | null>(null);
  return (
    <PublicSiteLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 max-w-3xl"><p className="text-xs font-bold uppercase text-primary">Impressão e digitalização</p><h1 className="mt-2 text-3xl font-extrabold">Central de impressoras e scanners</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Conecte este computador Windows, imprima arquivos e envie páginas digitalizadas diretamente para tratamento, OCR, edição ou PDF.</p></div>
        <PrintScanConnector onScanned={setScanned} />
        {scanned && <section className="mt-5"><h2 className="mb-3 text-lg font-bold">Imagem digitalizada</h2><PdfTools initialTool="enhance" initialFiles={[scanned]} /></section>}
      </main>
    </PublicSiteLayout>
  );
}