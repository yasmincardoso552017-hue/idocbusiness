import { Brand } from "@/components/Brand";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PublicSiteFooter } from "@/components/PublicSiteChrome";
import { Button } from "@/components/ui/button";
import heroWorkspace from "@/assets/idoc-hero-workspace.jpg";
import toolEnhance from "@/assets/tool-enhance-document.jpg";
import socialShare from "@/assets/idoc-social-share.jpg.asset.json";
import { publicToolList } from "@/lib/public-tools";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, BookOpen, Check, Download, FileSignature, FolderTree, Menu, PenLine, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";

const SITE = "https://idoc.business";
const HOME_TITLE = "Juntar PDF Grátis Online | IDOC BUSINESS";
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
      { property: "og:image", content: `${SITE}${socialShare.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
      { name: "twitter:image", content: `${SITE}${socialShare.url}` },
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
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active && data.session) navigate({ to: "/app", replace: true }); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (session) navigate({ to: "/app", replace: true }); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6"><Link to="/" className="mr-auto" aria-label="IDOC BUSINESS — início"><Brand className="h-7" /></Link><nav className="hidden gap-5 md:flex"><Link to="/ferramentas" className="text-sm font-medium text-muted-foreground">Ferramentas</Link><a href="#gestao" className="text-sm font-medium text-muted-foreground">Gestão e assinatura</a><a href="/manual-idoc-business.pdf" className="text-sm font-medium text-muted-foreground">Manual</a><Link to="/verify" className="text-sm font-medium text-muted-foreground">Verificar</Link></nav><Button size="icon" variant="ghost" className="md:hidden" aria-label="Ver ferramentas" asChild><Link to="/ferramentas"><Menu /></Link></Button><Button size="sm" variant="ghost" asChild><Link to="/auth">Entrar</Link></Button><Button size="sm" asChild><Link to="/auth">Criar conta</Link></Button></div></header>
      <main>
        <section className="relative isolate min-h-[610px] overflow-hidden border-b border-border sm:min-h-[680px]"><img src={heroWorkspace} alt="Ambiente digital com documentos, PDF, assinatura e pastas organizadas" className="absolute inset-0 -z-20 size-full object-cover object-[64%_center]" width={1920} height={1100} fetchPriority="high" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/95 to-background/20" /><div className="mx-auto flex min-h-[610px] max-w-7xl items-center px-4 py-14 sm:min-h-[680px] sm:px-6"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 border-l-2 border-accent bg-background/80 px-3 py-2 text-xs font-bold uppercase text-primary backdrop-blur"><Sparkles className="size-4" />PDF, contratos e assinaturas</span><h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl">Tudo que seu documento precisa. <span className="text-primary">Em um só lugar.</span></h1><p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-xl">Junte, divida, comprima, converta, edite, proteja e assine PDFs. Depois organize empresas, contratos e evidências sem trocar de plataforma.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg"><Link to="/auth">Começar grátis <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/ferramentas">Explorar ferramentas</Link></Button></div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><InstallAppButton className="justify-center" /><Button asChild variant="ghost"><a href="/manual-idoc-business.pdf" download="Manual-IDOC-BUSINESS.pdf"><BookOpen />Baixar manual ilustrado</a></Button></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">{["Grátis para começar", "Sem cartão", "Celular e computador", "Conforme LGPD"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{item}</span>)}</div></div></div></section>

        <section className="border-b border-border bg-card"><div className="mx-auto grid max-w-7xl divide-y divide-border px-4 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-6">{[["Ferramentas completas", "PDF do início ao fim"], ["Prévia antes de baixar", "Você confirma o resultado"], ["Assinatura com provas", "Campos e evidências"], ["Gestão por empresa", "Pastas e contratos"]].map(([title, text]) => <div key={title} className="py-5 sm:px-5"><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></div>)}</div></section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="text-xs font-bold uppercase text-primary">Ferramentas mais procuradas</span><h2 className="mt-2 max-w-2xl text-2xl font-extrabold sm:text-4xl">Resolva cada tarefa em uma área dedicada</h2></div><Link to="/ferramentas" className="inline-flex items-center gap-2 text-sm font-bold text-primary">Ver todas <ArrowRight className="size-4" /></Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{publicToolList.map((tool) => { const Icon = tool.icon; return <Link key={tool.slug} to="/ferramentas/$slug" params={{ slug: tool.slug }} className="group flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"><span className={`flex size-11 shrink-0 items-center justify-center rounded-md text-primary-foreground ${tool.iconClass}`}><Icon className="size-5" /></span><span><span className="block text-sm font-bold">{tool.shortTitle}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">Ver recursos e como usar</span></span><ArrowRight className="ml-auto size-4 text-muted-foreground" /></Link>; })}</div></section>

        <section className="border-y border-border bg-card" aria-labelledby="new-tool-title"><div className="mx-auto grid max-w-7xl overflow-hidden lg:grid-cols-[.9fr_1.1fr]"><div className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-12 lg:py-16"><span className="inline-flex w-fit items-center gap-2 rounded-full bg-warning px-3 py-1 text-[11px] font-extrabold uppercase text-warning-foreground"><Sparkles className="size-3.5" />Nova ferramenta</span><ScanLine className="mt-6 size-8 text-primary" /><h2 id="new-tool-title" className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">Documentos escaneados mais limpos, nítidos e legíveis</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Trate PDFs e imagens com manchas, sombras e ruídos. O IDOC BUSINESS melhora letras, números e códigos de barras sem recriar nem alterar o conteúdo original.</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">{["PDF, JPG, PNG e WEBP", "3 níveis de tratamento", "Prévia antes de baixar"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{item}</span>)}</div><Button asChild size="lg" className="mt-7 w-fit"><Link to="/ferramentas/$slug" params={{ slug: "tratar-documento" }}>Conhecer a novidade <ArrowRight /></Link></Button></div><div className="min-h-[300px] bg-muted lg:min-h-[500px]"><img src={toolEnhance} alt="Antes e depois de um documento escaneado tratado, com código de barras mais nítido" width={1600} height={1000} loading="lazy" className="size-full object-cover" /></div></div></section>

        <section id="gestao" className="border-y border-border bg-secondary/50"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20"><div className="max-w-3xl"><span className="text-xs font-bold uppercase text-primary">Muito além do PDF</span><h2 className="mt-2 text-2xl font-extrabold sm:text-4xl">Da primeira pasta ao contrato assinado</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">O IDOC BUSINESS conecta as ferramentas ao trabalho real: empresas, pastas, documentos, signatários, prazos e verificações no mesmo ambiente.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
          { icon: FolderTree, title: "Pastas como no computador", text: "Árvore de pastas e subpastas, arquivos por empresa e colaboração autenticada por SKU." },
          { icon: PenLine, title: "Assinatura no local certo", text: "Visualize cada página, mova e ajuste campos para cada signatário." },
          { icon: ShieldCheck, title: "Evidências individuais", text: "Escolha localização, documento com foto e selfie separadamente por pessoa." },
          { icon: BadgeCheck, title: "PDF final verificável", text: "Hash, QR Code, relatório de provas e verificação pública de autenticidade." },
        ].map((item) => <article key={item.title} className="border-l-2 border-primary bg-background p-5"><item.icon className="size-5 text-primary" /><h3 className="mt-4 text-sm font-bold">{item.title}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p></article>)}</div></div></section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_.8fr]"><div className="border border-border bg-card p-6 sm:p-8"><BookOpen className="size-7 text-primary" /><h2 className="mt-4 text-2xl font-extrabold">Manual prático ilustrado</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Aprenda empresas, pastas, SKU, upload, tratamento de digitalizações, assinaturas, contratos, OCR, conversões, segurança e auditoria jurídica em um guia com 21 páginas.</p><Button asChild className="mt-6"><a href="/manual-idoc-business.pdf" download="Manual-IDOC-BUSINESS.pdf"><Download />Baixar manual em PDF</a></Button></div><div className="border border-border bg-primary p-6 text-primary-foreground sm:p-8"><FileSignature className="size-7" /><h2 className="mt-4 text-2xl font-extrabold">Comece com um documento real</h2><p className="mt-3 text-sm leading-relaxed opacity-90">Crie uma conta, cadastre a empresa e escolha entre organizar, editar ou enviar para assinatura.</p><Button asChild variant="secondary" className="mt-6"><Link to="/auth">Criar minha conta <ArrowRight /></Link></Button></div></section>

        <section className="border-t border-border bg-card"><div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20"><h2 className="text-2xl font-extrabold sm:text-3xl">Perguntas frequentes</h2><div className="mt-6 divide-y divide-border border-y border-border">{faq.map((item) => <article key={item.q} className="py-5"><h3 className="text-sm font-bold">{item.q}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p></article>)}</div></div></section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}