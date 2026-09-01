import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, FileSignature, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyDocument } from "@/lib/signing.functions";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verificar documento assinado — DocFlow" },
      {
        name: "description",
        content:
          "Confira a autenticidade de um documento assinado no DocFlow informando o código de verificação.",
      },
      { property: "og:title", content: "Verificar documento assinado — DocFlow" },
      {
        property: "og:description",
        content: "Validação pública de documentos assinados eletronicamente no DocFlow.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code: initial } = Route.useSearch();
  const [code, setCode] = useState(initial ?? "");

  const check = useMutation({
    mutationFn: (c: string) => verifyDocument({ data: { code: c.trim() } }),
  });

  useEffect(() => {
    if (initial && initial.length >= 4) check.mutate(initial);
  }, [initial]);

  const result = check.data;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="gradient-brand flex size-8 items-center justify-center rounded-lg">
              <FileSignature className="size-4 text-primary-foreground" />
            </span>
            <span className="text-sm font-extrabold tracking-tight">DocFlow</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-extrabold tracking-tight">Verificar documento</h1>
        <p className="text-sm text-muted-foreground">
          Informe o código de verificação que aparece na página de evidências e no rodapé do PDF assinado.
        </p>

        <form
          className="card-soft flex flex-col gap-2 p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 4) check.mutate(code);
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex.: A1B2C3D4"
            className="flex-1"
          />
          <Button type="submit" disabled={check.isPending || code.trim().length < 4}>
            {check.isPending ? "Verificando…" : "Verificar"}
          </Button>
        </form>

        {result && result.valid ? (
          <section className="card-soft space-y-2 p-4">
            <div className="flex items-center gap-2 text-primary">
              <BadgeCheck className="size-5" />
              <h2 className="text-sm font-bold">Documento autêntico</h2>
            </div>
            <dl className="space-y-1 text-xs">
              <Row label="Documento" value={result.document.name} />
              <Row label="Código" value={result.code ?? "—"} />
              <Row label="Assinado em" value={fmtDateTime(result.signedAt)} />
              <Row label="Hash final (SHA-256)" value={result.finalHash ?? "—"} mono />
            </dl>
            <div className="pt-2">
              <p className="text-xs font-semibold">Signatários</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {result.signers.map((s, i) => (
                  <li key={i}>
                    {s.name} • {s.email} • {fmtDateTime(s.signed_at)}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {result && !result.valid ? (
          <section className="card-soft flex items-start gap-2 p-4">
            <ShieldAlert className="mt-0.5 size-5 text-destructive" />
            <div>
              <h2 className="text-sm font-bold">Código não encontrado</h2>
              <p className="text-xs text-muted-foreground">
                Confira o código digitado. Documentos ainda em assinatura não possuem código de verificação.
              </p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className={mono ? "break-all font-mono text-[11px]" : "font-medium"}>{value}</dd>
    </div>
  );
}
