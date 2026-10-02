import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";

import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string };
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };

type OAuthApi = {
  getAuthorizationDetails: (authorizationId: string) => Promise<OAuthResult>;
  approveAuthorization: (authorizationId: string) => Promise<OAuthResult>;
  denyAuthorization: (authorizationId: string) => Promise<OAuthResult>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as typeof supabase.auth & { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search["authorization_id"] === "string" ? search["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Solicitação de conexão inválida.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = `${location.pathname}${location.searchStr}`;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Solicitação de conexão inválida.");
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Autorizar integração | IDOC BUSINESS" },
      { name: "description", content: "Autorize um assistente a acessar ferramentas da sua conta IDOC BUSINESS." },
      { property: "og:title", content: "Autorizar integração | IDOC BUSINESS" },
      { property: "og:description", content: "Conexão segura com a conta IDOC BUSINESS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="card-soft max-w-md p-6 text-center">
        <ShieldCheck className="mx-auto mb-3 size-9 text-destructive" />
        <h1 className="text-lg font-bold">Não foi possível abrir esta autorização</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "A autorização não pôde ser carregada."}</p>
      </div>
    </main>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "Gemini";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const result = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (result.error) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    const target = result.data?.redirect_url ?? result.data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O serviço de autorização não retornou o endereço de conclusão.");
      return;
    }
    window.location.assign(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="card-soft w-full max-w-md p-6">
        <Brand className="mx-auto mb-6 h-9" />
        <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Conectar {clientName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O assistente poderá buscar e listar somente os documentos acessíveis pela sua conta.
        </p>
        <div className="mt-5 rounded-lg border p-3 text-sm">
          <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Buscar documentos por nome</div>
          <div className="mt-2 flex items-center gap-2"><Check className="size-4 text-primary" /> Listar informações dos documentos</div>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground"><X className="size-4" /> Não baixa, altera ou exclui arquivos</div>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Negar</Button>
          <Button disabled={busy} onClick={() => decide(true)}>Autorizar</Button>
        </div>
      </section>
    </main>
  );
}
