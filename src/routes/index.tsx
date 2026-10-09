import { InstallAppButton } from "@/components/InstallAppButton";
import { PublicSiteLayout } from "@/components/PublicSiteChrome";
import { Button } from "@/components/ui/button";
import heroWorkspace from "@/assets/idoc-hero-workspace.jpg";
import toolEnhance from "@/assets/tool-enhance-document.jpg";
import { publicToolList } from "@/lib/public-tools";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, Check, FolderTree, PenLine, Printer, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const SITE = "https://idoc.business";
const HOME_TITLE = "Ferramentas de PDF Grátis Online | IDOC BUSINESS";
const HOME_DESCRIPTION = "Junte PDFs grátis, trate documentos escaneados e use ferramentas para dividir, comprimir, editar, converter, assinar, proteger e aplicar OCR.";
const faq = [
  { q: "Posso usar as ferramentas de PDF no celular?", a: "Sim. O IDOC BUSINESS funciona no navegador do celular, tablet e computador e também pode ser instalado na tela inicial." },
  { q: "Consigo conferir o arquivo antes de baixar?", a: "Sim. As ferramentas foram organizadas para permitir pré-visualização, seleção de páginas, nome e formato antes do download." },
  { q: "A assinatura eletrônica registra evidências?", a: "Sim. O fluxo pode registrar aceite, data, hora, IP, dispositivo, geolocalização, documento com foto e selfie, conforme as exigências definidas para cada pessoa." },
  { q: "Meus documentos ficam separados por conta?", a: "Sim. Cada conta acessa seus próprios dados. O único espaço colaborativo é uma pasta compartilhada por SKU e ativada por usuários autenticados." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: SITE }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", name: "IDOC BUSINESS", url: SITE, logo: `${SITE}/icon-idoc-512.png` },
      { "@type": "SoftwareApplication", name: "IDOC BUSINESS", applicationCategory: "BusinessApplication", operatingSystem: "Web, Android, iOS", url: SITE, description: "Ferramentas de PDF, gestão documental e assinatura eletrônica com evidências.", offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" } },
      { "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
    ] }) }],
  }),
  component: Landing,
});

function Landing() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tools = publicToolList.filter((tool) => `${tool.shortTitle} ${tool.description}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedSearch));

  return (
    <PublicSiteLayout>
      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <img src={heroWorkspace} alt="Documentos e ferramentas de PDF em um ambiente de trabalho digital" className="absolute inset-0 -z-20 size-full object-cover object-right" width={1920} height={1100} fetchPriority="high" />
          <div className="absolute inset-0 -z-10 bg-background/90" />
          <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
            <p className="text-xs font-bold uppercase text-primary">PDF · Assinatura · Documentos</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">IDOC BUSINESS</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Seu PDF pronto para o próximo passo. Junte, edite, converta e assine, sem precisar criar uma conta.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
              {["Sem cadastro nas ferramentas locais", "Prévia antes de baixar", "Arquivos temporários"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{item}</span>)}
            </div>
          </div>
        </section>

        <section id="ferramentas" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="tools-title">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase text-primary">Sua central de trabalho</p><h2 id="tools-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">O que você precisa fazer?</h2></div>
            <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar ferramentas" placeholder="Buscar ferramenta…" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 bg-card pl-10" /></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => { const Icon = tool.icon; return (
              <Link key={tool.slug} to="/ferramentas/$slug" params={{ slug: tool.slug }} hash="usar-ferramenta" className="group relative flex min-h-40 gap-4 overflow-hidden rounded-md border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-md text-primary-foreground ${tool.iconClass}`}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-base font-bold">{tool.shortTitle}</h3><ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tool.description}</p><span className="mt-3 inline-block text-xs font-bold text-primary">Abrir ferramenta</span></div>
              </Link>
            ); })}
            {!search && <Link to="/ferramentas/imprimir-digitalizar" className="group flex min-h-40 gap-4 rounded-md border border-border bg-card p-5 transition-colors hover:border-primary"><span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-tool-ocr text-primary-foreground"><Printer className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="text-base font-bold">Imprimir e digitalizar</h3><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Impressão pelo sistema e documentos da câmera ou do scanner, sem instalação obrigatória.</p><span className="mt-3 inline-block text-xs font-bold text-primary">Abrir central</span></div></Link>}
          </div>
          {tools.length === 0 && <div className="py-10 text-center"><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nenhuma ferramenta encontrada.</p><Button variant="ghost" className="mt-2" onClick={() => setSearch("")}>Limpar busca</Button></div>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Ferramentas locais sem envio de arquivos. OCR online exige conta.</p><Button asChild variant="ghost" size="sm"><Link to="/ferramentas">Todas as opções <ArrowRight /></Link></Button></div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:px-6 md:grid-cols-[1fr_1.1fr]">
            <div className="overflow-hidden rounded-md bg-muted"><img src={toolEnhance} alt="Comparação de uma digitalização antes e depois do tratamento" width={1600} height={1000} loading="lazy" className="aspect-[2/1] w-full object-cover" /></div>
            <div><span className="text-xs font-bold uppercase text-tool-optimize">Em destaque · Tratar documento</span><h2 className="mt-2 text-2xl font-extrabold">Mais clareza para suas digitalizações</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Ajuste nitidez, sombras e ruídos em PDFs e imagens. Compare o resultado antes de baixar.</p><Button asChild variant="outline" className="mt-5"><Link to="/ferramentas/$slug" params={{ slug: "tratar-documento" }} hash="usar-ferramenta">Tratar meu documento <ArrowRight /></Link></Button></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase text-primary">Para o trabalho em equipe</p><h2 className="mt-2 text-2xl font-extrabold">Documentos organizados. Contratos acompanhados.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Sua conta reúne empresas, pastas e contratos. Envie links individuais para assinatura e acompanhe as evidências de cada pessoa.</p></div><Button asChild><Link to="/auth">Acessar minha conta <ArrowRight /></Link></Button></div>
          <div className="mt-7 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">{[{ icon: FolderTree, title: "Empresas e pastas", text: "Documentos por empresa e colaboração por SKU." }, { icon: PenLine, title: "Assinaturas e contratos", text: "Campos posicionados e acompanhamento por signatário." }, { icon: BadgeCheck, title: "Verificação pública", text: "Consulte a autenticidade dos documentos registrados." }].map((item) => <div key={item.title}><item.icon className="size-5 text-primary" /><h3 className="mt-3 text-sm font-bold">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p></div>)}</div>
        </section>

        <section className="border-t border-border bg-secondary/40"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center"><div><h2 className="text-lg font-bold">IDOC BUSINESS sempre à mão</h2><p className="mt-1 text-xs text-muted-foreground">Acesso ao aplicativo e ao manual ilustrado.</p></div><div className="flex flex-wrap gap-2"><InstallAppButton /><Button asChild variant="outline"><a href="/manual-idoc-business.pdf" download="Manual-IDOC-BUSINESS.pdf"><BookOpen />Baixar manual</a></Button></div></div></section>
      </main>
    </PublicSiteLayout>
  );
}
