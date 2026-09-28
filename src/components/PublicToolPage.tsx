import { Button } from "@/components/ui/button";
import { PdfTools } from "@/components/PdfTools";
import { PublicSiteLayout } from "@/components/PublicSiteChrome";
import { publicTools, type PublicToolSlug } from "@/lib/public-tools";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, FileCheck2, ShieldCheck } from "lucide-react";

export function publicToolHead(slug: PublicToolSlug) {
  const tool = publicTools[slug];
  const url = `https://idoc.business/ferramentas/${slug}`;
  const seoTitle = `${tool.shortTitle} online grátis | IDOC BUSINESS`;
  const faq = tool.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } }));
  return {
    meta: [
      { title: seoTitle },
      { name: "description", content: tool.description },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: seoTitle },
      { property: "og:description", content: tool.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: seoTitle },
      { name: "twitter:description", content: tool.description },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@graph": [
        { "@type": "SoftwareApplication", name: tool.shortTitle, applicationCategory: "BusinessApplication", operatingSystem: "Web", url, description: tool.description, offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: "https://idoc.business" },
          { "@type": "ListItem", position: 2, name: "Ferramentas", item: "https://idoc.business/ferramentas" },
          { "@type": "ListItem", position: 3, name: tool.shortTitle, item: url },
        ] },
        { "@type": "FAQPage", mainEntity: faq },
      ],
    }) }],
  };
}

export function PublicToolPage({ slug }: { slug: PublicToolSlug }) {
  const tool = publicTools[slug];
  const ToolIcon = tool.icon;
  return (
    <PublicSiteLayout>
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
            <Link to="/">Início</Link><ChevronRight className="mx-1 inline size-3" /><Link to="/ferramentas">Ferramentas</Link><ChevronRight className="mx-1 inline size-3" /><span className="text-foreground">{tool.shortTitle}</span>
          </div>
        </section>
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div>
              <span className="text-xs font-bold uppercase text-primary">{tool.eyebrow}</span>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">{tool.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{tool.intro}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg"><a href="#usar-ferramenta">Usar {tool.shortTitle.toLowerCase()} <ArrowRight /></a></Button>
                <Button asChild size="lg" variant="outline"><Link to="/ferramentas">Ver todas as ferramentas</Link></Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium"><span className="flex items-center gap-1.5"><Check className="size-4 text-success" />Grátis para começar</span><span className="flex items-center gap-1.5"><Check className="size-4 text-success" />Prévia antes de baixar</span><span className="flex items-center gap-1.5"><Check className="size-4 text-success" />Celular e computador</span></div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-muted shadow-soft"><img src={tool.image} alt={tool.imageAlt} width={900} height={600} className="aspect-[3/2] size-full object-cover" fetchPriority="high" /></div>
          </div>
        </section>

        <section id="usar-ferramenta" className="scroll-mt-20 border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase text-primary">Sem cadastro</p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Use a ferramenta agora</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Seus arquivos não são salvos no IDOC BUSINESS. O processamento comum acontece no seu dispositivo e o download só começa quando você confirma.
              </p>
            </div>
            <PdfTools initialTool={tool.appTool} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div><span className={`flex size-12 items-center justify-center rounded-md text-primary-foreground ${tool.iconClass}`}><ToolIcon className="size-6" /></span><h2 className="mt-5 text-2xl font-extrabold">O que você pode fazer</h2><ul className="mt-5 grid gap-3">{tool.benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>{benefit}</span></li>)}</ul></div>
            <div className="border-l border-border pl-6 sm:pl-10"><h2 className="text-2xl font-extrabold">Como usar em 4 passos</h2><ol className="mt-6 grid gap-5 sm:grid-cols-2">{tool.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><span className="pt-1 text-sm leading-relaxed">{step}</span></li>)}</ol><p className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground"><strong className="text-foreground">Formatos:</strong> {tool.formats}</p></div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
            <div><FileCheck2 className="size-6 text-primary" /><h2 className="mt-3 text-lg font-bold">Ideal para tarefas reais</h2></div>
            {tool.useCases.map((useCase) => <div key={useCase} className="border-l border-border pl-5"><p className="text-sm font-semibold">{useCase}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Prepare o documento com controle e revise o resultado antes de compartilhar.</p></div>)}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div><ShieldCheck className="size-7 text-primary" /><h2 className="mt-3 text-2xl font-extrabold">Privacidade e controle</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">As ferramentas comuns de PDF são processadas no seu dispositivo sempre que possível. O reconhecimento OCR é a exceção indicada dentro do aplicativo. Você confirma o resultado antes de baixar.</p></div>
            <div><h2 className="text-2xl font-extrabold">Dúvidas sobre {tool.shortTitle.toLowerCase()}</h2><div className="mt-5 divide-y divide-border border-y border-border">{tool.faq.map((item) => <article key={item.question} className="py-5"><h3 className="text-sm font-bold">{item.question}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p></article>)}</div></div>
          </div>
        </section>

        <section className="border-t border-border bg-card"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-xs font-bold uppercase text-primary">Ferramentas relacionadas</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{tool.related.map((relatedSlug) => { const related = publicTools[relatedSlug]; const RelatedIcon = related.icon; return <Link key={relatedSlug} to="/ferramentas/$slug" params={{ slug: relatedSlug }} className="flex items-center gap-3 rounded-md border border-border bg-background p-4 hover:border-primary"><span className={`flex size-10 items-center justify-center rounded-md text-primary-foreground ${related.iconClass}`}><RelatedIcon className="size-5" /></span><span className="font-bold">{related.shortTitle}</span><ArrowRight className="ml-auto size-4 text-muted-foreground" /></Link>; })}</div></div></section>
      </main>
    </PublicSiteLayout>
  );
}