import { PublicSiteLayout } from "@/components/PublicSiteChrome";
import { Button } from "@/components/ui/button";
import { publicToolList } from "@/lib/public-tools";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

const SITE = "https://idoc.business/ferramentas";

export const Route = createFileRoute("/ferramentas/")({
  head: () => ({
    meta: [
      { title: "Ferramentas de PDF grátis e online | IDOC BUSINESS" },
      { name: "description", content: "Junte, divida, trate digitalizações, comprima, converta, edite, assine, proteja e aplique OCR em PDFs com prévia antes do download." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Ferramentas de PDF grátis e online | IDOC BUSINESS" },
      { property: "og:description", content: "Uma central profissional para organizar, tratar, converter, editar, assinar, proteger e reconhecer texto em PDFs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "Ferramentas de PDF do IDOC BUSINESS", url: SITE, hasPart: publicToolList.map((tool) => ({ "@type": "SoftwareApplication", name: tool.shortTitle, url: `${SITE}/${tool.slug}` })) }) }],
  }),
  component: ToolsDirectory,
});

function ToolsDirectory() {
  return (
    <PublicSiteLayout>
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <span className="text-xs font-bold uppercase text-primary">Central de produtividade</span>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">Ferramentas de PDF grátis, organizadas em um só lugar</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Escolha o que precisa fazer. Você visualiza o resultado, ajusta páginas, nome e formato e só então baixa o novo arquivo.</p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">{["Prévia antes de baixar", "Celular e computador", "Sem cartão para começar"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{item}</span>)}</div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {publicToolList.map((tool) => { const Icon = tool.icon; return (
              <article key={tool.slug} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft">
                <div className="aspect-[3/2] overflow-hidden bg-muted"><img src={tool.image} alt={tool.imageAlt} width={900} height={600} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div>
                <div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3"><span className={`flex size-10 items-center justify-center rounded-md text-primary-foreground ${tool.iconClass}`}><Icon className="size-5" /></span>{tool.slug === "tratar-documento" && <span className="rounded-full bg-warning px-2.5 py-1 text-[10px] font-extrabold uppercase text-warning-foreground">Novidade</span>}</div><h2 className="mt-4 text-lg font-extrabold">{tool.shortTitle}</h2><p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p><Link to="/ferramentas/$slug" params={{ slug: tool.slug }} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Conhecer a ferramenta <ArrowRight className="size-4" /></Link></div>
              </article>
            ); })}
          </div>
        </section>
        <section className="border-t border-border bg-secondary/50"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center"><div><h2 className="text-2xl font-extrabold">Pronto para trabalhar no seu documento?</h2><p className="mt-2 text-sm text-muted-foreground">Crie sua conta e abra a central completa de ferramentas.</p></div><Button asChild size="lg"><Link to="/auth">Começar grátis <ArrowRight /></Link></Button></div></section>
      </main>
    </PublicSiteLayout>
  );
}