import { PdfTools } from "@/components/PdfTools";
import { AppShell } from "@/components/AppShell";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/ferramentas")({
  validateSearch: (search: Record<string, unknown>): { tool?: string } =>
    typeof search["tool"] === "string" ? { tool: search["tool"] } : {},
  head: () => ({
    meta: [
      { title: "Ferramentas de PDF — organizar, converter, editar e proteger | IDOC BUSINESS" },
      { name: "description", content: "Junte, divida, converta, edite, assine, proteja, comprima e aplique OCR em PDFs direto no navegador." },
      { property: "og:title", content: "Ferramentas de PDF — IDOC BUSINESS" },
      { property: "og:description", content: "Central completa de PDF: organizar, converter, editar, assinar, proteger, comprimir e OCR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthenticatedTools,
});

function AuthenticatedTools() {
  const { tool } = Route.useSearch();
  return (
    <AppShell title="Ferramentas de PDF">
      <PdfTools {...(tool ? { initialTool: tool } : {})} isAuthenticated />
    </AppShell>
  );
}
