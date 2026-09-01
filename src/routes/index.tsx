import { Brand } from "@/components/Brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileSignature,
  ShieldCheck,
  Building2,
  PenLine,
  FolderTree,
  BadgeCheck,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IDOC BUSINESS — Gestão de Documentos, Contratos e Assinaturas" },
      {
        name: "description",
        content:
          "Organize documentos, gerencie contratos e colete assinaturas eletrônicas com evidências, auditoria e verificação pública.",
      },
      { property: "og:title", content: "IDOC BUSINESS — Documentos, Contratos e Assinaturas" },
      {
        property: "og:description",
        content:
          "Plataforma mobile-first para documentos, contratos e assinatura eletrônica com validade jurídica.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Building2, t: "Multiempresa", d: "Cada empresa com pastas, documentos e contratos isolados." },
  { icon: FolderTree, t: "Organização", d: "Pastas automáticas para pendentes, assinados e arquivados." },
  { icon: PenLine, t: "Assinatura eletrônica", d: "Vários signatários, ordem sequencial e campos posicionados." },
  { icon: ShieldCheck, t: "Evidências e auditoria", d: "IP, dispositivo, data/hora e trilha imutável." },
  { icon: BadgeCheck, t: "Verificação pública", d: "Código e hash para conferir autenticidade a qualquer momento." },
  { icon: FileSignature, t: "PDF final assinado", d: "Página de evidências, QR Code e rodapé em todas as páginas." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Brand className="h-7 flex-1" />
          <Link to="/verify" className="text-xs font-medium text-muted-foreground">
            Verificar
          </Link>
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-10 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> LGPD • Trilha de auditoria imutável
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Documentos, contratos e assinaturas eletrônicas em um só lugar
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            O IDOC BUSINESS centraliza os documentos das suas empresas, controla vencimentos de contratos e
            coleta assinaturas eletrônicas com evidências completas e PDF final verificável.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Começar agora <ArrowRight className="size-4" />
            </Link>
            <InstallAppButton className="px-5 py-3" />
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-xl border border-input px-5 py-3 text-sm font-semibold"
            >
              Verificar documento
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="card-soft p-4">
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-4" />
              </div>
              <h2 className="text-sm font-bold">{f.t}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 card-soft p-5">
          <h2 className="text-lg font-bold">Como funciona</h2>
          <ol className="mt-3 grid gap-2 text-sm">
            {[
              "Cadastre a empresa e as pastas são criadas automaticamente",
              "Envie o documento em PDF com hash de integridade",
              "Adicione signatários e posicione os campos na página",
              "Envie o link seguro e acompanhe cada visualização",
              "Receba o PDF final assinado com página de evidências",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2 text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">IDOC BUSINESS</span>
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/ajuda">Ajuda</Link>
        </div>
      </footer>
    </div>
  );
}
