import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, LogIn } from "lucide-react";

import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

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
  return (
    <PublicPage title="Acesso protegido">
      <div className="space-y-4 text-center">
        <KeyRound className="mx-auto size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          O acesso público por link foi desativado. Entre na sua conta e use o SKU recebido na central de pastas compartilhadas.
        </p>
        <Button asChild className="w-full">
          <Link to="/auth">
            <LogIn className="mr-2 size-4" /> Entrar com segurança
          </Link>
        </Button>
      </div>
    </PublicPage>
  );
}
