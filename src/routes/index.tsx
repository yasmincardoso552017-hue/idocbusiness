import { Brand } from "@/components/Brand";
import { InstallAppButton } from "@/components/InstallAppButton";
import heroWorkspace from "@/assets/idoc-hero-workspace.jpg";
import toolOrganize from "@/assets/tool-organize.jpg";
import toolConvert from "@/assets/tool-convert.jpg";
import toolEdit from "@/assets/tool-edit.jpg";
import toolSign from "@/assets/tool-sign.jpg";
import toolSecurity from "@/assets/tool-security.jpg";
import toolCompress from "@/assets/tool-compress.jpg";
import toolOcr from "@/assets/tool-ocr.jpg";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileSignature,
  ShieldCheck,
  Building2,
  PenLine,
  FolderTree,
  BadgeCheck,
  ArrowRight,
  Check,
  BellRing,
  FileStack,
  Scale,
  Smartphone,
  Lock,
  Sparkles,
  Layers,
  RefreshCw,
  PencilRuler,
  Gauge,
  ScanText,
  BookOpen,
  Download,

} from "lucide-react";


const SITE = "https://idoc.business";

const faq = [
  {
    q: "A assinatura eletrônica do IDOC BUSINESS tem validade jurídica?",
    a: "Sim. A assinatura eletrônica é válida no Brasil conforme a MP 2.200-2/2001 e a Lei 14.063/2020. Cada assinatura no IDOC BUSINESS guarda IP, dispositivo, data e hora, geolocalização opcional, documento com foto e selfie, além de hash de integridade e código público de verificação.",
  },
  {
    q: "Como funciona a verificação de autenticidade do documento?",
    a: "Todo documento finalizado recebe um código de verificação e um hash SHA-256 impressos na página de evidências e no rodapé. Qualquer pessoa pode conferir o documento na página pública de verificação, sem precisar de login.",
  },
  {
    q: "Consigo assinar documentos pelo celular?",
    a: "Sim. O IDOC BUSINESS é mobile-first e pode ser instalado como aplicativo na tela inicial do celular, funcionando em Android, iPhone, tablet e desktop.",
  },
  {
    q: "Posso gerenciar documentos de várias empresas na mesma conta?",
    a: "Sim. A plataforma é multiempresa: cada empresa (pessoa física ou jurídica) tem pastas, subpastas, documentos e contratos isolados, com links públicos opcionais para compartilhamento de pastas.",
  },
  {
    q: "Existem lembretes automáticos de assinatura e vencimento?",
    a: "Sim. Você agenda lembretes com data e hora para signatários e recebe notificações na tela inicial do dispositivo, mesmo com o aplicativo fechado, além de alertas de contratos a vencer.",
  },
];

const features = [
  { icon: Building2, t: "Multiempresa (PF e PJ)", d: "Cadastre pessoas físicas e jurídicas com pastas, documentos e contratos isolados por empresa." },
  { icon: FolderTree, t: "Pastas e subpastas", d: "Organize por pastas, crie subpastas, baixe tudo em ZIP e gere link público para compartilhar." },
  { icon: PenLine, t: "Assinatura com posicionamento", d: "Veja cada página do PDF, arraste e redimensione o campo de assinatura exatamente onde deve ficar." },
  { icon: ShieldCheck, t: "Provas e auditoria", d: "IP, dispositivo, data/hora, geolocalização, documento com foto e selfie em trilha imutável." },
  { icon: BadgeCheck, t: "Verificação pública", d: "Código e hash SHA-256 para conferir autenticidade a qualquer momento, sem login." },
  { icon: FileSignature, t: "PDF final assinado", d: "Página de evidências, QR Code e rodapé em todas as páginas do documento concluído." },
  { icon: BellRing, t: "Lembretes e notificações", d: "Agende avisos por data e hora que chegam na tela inicial mesmo com o app fechado." },
  { icon: FileStack, t: "Ferramentas de PDF", d: "Unir, dividir, girar, numerar, marca d'água, converter para imagens, texto, Word e PDF pesquisável." },
  { icon: Scale, t: "Auditor jurídico com IA", d: "Envie o contrato e receba análise linha a linha com riscos, brechas e sugestões de blindagem." },
];

const toolCategories = [
  {
    icon: Layers,
    image: toolOrganize,
    t: "Organizar PDFs",
    items: ["Juntar vários PDFs", "Dividir e extrair páginas", "Reordenar e excluir páginas", "Girar páginas"],
  },
  {
    icon: RefreshCw,
    image: toolConvert,
    t: "Converter arquivos",
    items: ["PDF para Word, Excel e PowerPoint", "PDF para JPG e JPG para PDF", "Word, Excel, PPT e HTML para PDF", "PDF/A para arquivamento"],
  },
  {
    icon: PencilRuler,
    image: toolEdit,
    t: "Editar PDF",
    items: ["Adicionar textos e imagens", "Formas, destaques e anotações", "Desenhar à mão", "Preencher formulários"],
  },
  {
    icon: PenLine,
    image: toolSign,
    t: "Assinatura",
    items: ["Assinar você mesmo", "Solicitar assinaturas de outras pessoas", "Campos de assinatura, inicial e texto"],
  },
  {
    icon: Lock,
    image: toolSecurity,
    t: "Segurança",
    items: ["Colocar senha e criptografar", "Remover senha quando possível", "Redigir dados sensíveis"],
  },
  {
    icon: Gauge,
    image: toolCompress,
    t: "Otimização",
    items: ["Comprimir PDF", "Reduzir para enviar por e-mail e WhatsApp", "Três níveis de compressão"],
  },
  {
    icon: ScanText,
    image: toolOcr,
    t: "OCR",
    items: ["Reconhecer texto de digitalizações", "Gerar PDF pesquisável", "Extrair texto de imagens e documentos"],
  },
];


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "IDOC BUSINESS | Assinatura Eletrônica e Gestão de Contratos",
      },
      {
        name: "description",
        content:
          "Assinatura eletrônica com validade jurídica, gestão de contratos e documentos em nuvem. Multiempresa, provas de autoria, auditoria, lembretes e verificação pública. Teste grátis.",
      },
      {
        name: "keywords",
        content:
          "assinatura eletrônica, assinatura digital, gestão de contratos, gestão de documentos, assinar PDF online, validade jurídica, LGPD, GED, contrato online",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "IDOC BUSINESS" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      {
        property: "og:title",
        content: "IDOC BUSINESS | Assinatura Eletrônica e Gestão de Contratos",
      },
      {
        property: "og:description",
        content:
          "Organize documentos por empresa, envie para assinatura, colete provas de autoria e gere PDF assinado verificável.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "IDOC BUSINESS | Assinatura Eletrônica e Gestão de Contratos",
      },
      {
        name: "twitter:description",
        content:
          "Assinatura eletrônica com evidências, auditoria e verificação pública. Mobile-first, instalável como app.",
      },
    ],
    links: [{ rel: "canonical", href: SITE }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: "IDOC BUSINESS",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              url: SITE,
              inLanguage: "pt-BR",
              description:
                "Plataforma de gestão de documentos, contratos e assinatura eletrônica com provas de autoria, auditoria imutável e verificação pública.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            },
            {
              "@type": "Organization",
              name: "IDOC BUSINESS",
              url: SITE,
              logo: `${SITE}/icon-512.png`,
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/app", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/app", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Brand className="h-7 flex-1" />
          <a href="#recursos" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Recursos
          </a>
          <a href="#ferramentas" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Ferramentas
          </a>
          <a href="#manual" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Manual
          </a>

          <a href="#planos" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Planos
          </a>
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

      <main className="pb-16">
        <section className="relative isolate min-h-[650px] overflow-hidden border-b border-border sm:min-h-[700px]">
          <img src={heroWorkspace} alt="Documentos digitais organizados, convertidos, protegidos e assinados" className="absolute inset-0 -z-20 size-full object-cover object-[68%_center] sm:object-center" width={1920} height={1100} fetchPriority="high" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/95 to-background/10 sm:via-background/80" />
          <div className="mx-auto flex min-h-[650px] max-w-7xl items-center px-4 py-14 sm:min-h-[700px] sm:px-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 border-l-2 border-accent bg-background/70 px-3 py-2 text-xs font-bold uppercase text-primary backdrop-blur-sm">
                <Sparkles className="size-4" /> 28 ferramentas profissionais, grátis para começar
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] sm:text-6xl lg:text-7xl">
                Seus documentos.<br />Todas as soluções.<br /><span className="text-primary">Um só lugar.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-xl">
                Edite, converta, organize, proteja e assine PDFs com validade jurídica. Trabalhe com contratos e arquivos sem instalar nada.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                  Usar grátis agora <ArrowRight className="size-4" />
                </Link>
                <InstallAppButton className="justify-center px-5 py-4" />
                <a href="/manual-idoc-business.pdf" download="Manual-IDOC-BUSINESS.pdf" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/90 px-5 py-4 text-sm font-semibold backdrop-blur-sm">
                  <BookOpen className="size-4 text-primary" /> Manual ilustrado
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-foreground">
                {["Sem cartão", "Celular e computador", "Conforme LGPD"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-success" />{item}</span>)}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <dl className="grid border-x border-b border-border bg-card sm:grid-cols-4">
            {[["28 ferramentas", "Para trabalhar com PDFs"], ["Assinatura válida", "Com evidências completas"], ["Gestão por empresa", "Pastas e contratos organizados"], ["Verificação pública", "Código e hash SHA-256"]].map(([t, d]) => (
              <div key={t} className="border-b border-border p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <dt className="text-sm font-extrabold">{t}</dt><dd className="mt-1 text-xs text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>

        <section id="recursos" className="scroll-mt-20 py-16 sm:py-24">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Tudo que você precisa para assinar e organizar documentos
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Do cadastro da empresa ao arquivo assinado, com controle de vencimentos, lembretes
            automáticos e ferramentas de PDF integradas.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.t} className="card-soft p-4">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-4" />
                </div>
                <h3 className="text-sm font-bold">{f.t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ferramentas" className="scroll-mt-20 border-t border-border py-16 sm:py-24">
          <span className="text-xs font-bold uppercase text-primary">Central de produtividade</span>
          <h2 className="mt-2 max-w-3xl text-2xl font-extrabold sm:text-4xl">Uma ferramenta profissional para cada tarefa</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Organize, converta, edite, assine, proteja, comprima e reconheça texto — tudo no navegador, com
            pré-visualização e escolha do nome e do formato antes de baixar.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {toolCategories.map((c, index) => (
              <article key={c.t} className={`group overflow-hidden rounded-lg border border-border bg-card shadow-soft ${index === 0 ? "lg:col-span-2" : ""}`}>
                <div className={`overflow-hidden bg-muted ${index === 0 ? "aspect-[2/1]" : "aspect-[3/2]"}`}>
                  <img src={c.image} alt={`Ferramentas para ${c.t.toLowerCase()}`} loading="lazy" width={900} height={600} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><c.icon className="size-4" /></span><h3 className="text-base font-extrabold">{c.t}</h3></div>
                  <ul className="mt-4 grid gap-2 text-xs text-muted-foreground">
                  {c.items.map((i) => (
                    <li key={i} className="flex gap-1.5">
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" /> {i}
                    </li>
                  ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="manual" className="mt-10 scroll-mt-20 card-soft gradient-brand p-5 text-primary-foreground sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold">
                <BookOpen className="size-3.5" /> Manual prático ilustrado
              </span>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Passo a passo ilustrado de todas as ferramentas
              </h2>
              <p className="mt-2 text-xs leading-relaxed opacity-90 sm:text-sm">
                Um guia em PDF com telas ilustradas de cada função: criar empresa e pastas, enviar
                documentos, posicionar assinaturas, organizar, converter, editar, proteger com senha,
                comprimir para WhatsApp e reconhecer texto com OCR.
              </p>
              <ul className="mt-3 grid gap-1 text-xs opacity-90 sm:grid-cols-2">
                {[
                  "19 capítulos com telas ilustradas",
                  "Passos numerados e dicas práticas",
                  "Verificação pública explicada",
                  "Lembretes e notificações",
                ].map((i) => (
                  <li key={i} className="flex gap-1.5">
                    <Check className="mt-0.5 size-3 shrink-0" /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="/manual-idoc-business.pdf"
              download="Manual-IDOC-BUSINESS.pdf"
              className="inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-semibold text-primary"
            >
              <Download className="size-4" /> Baixar o manual em PDF
            </a>
          </div>
        </section>


        <section className="mt-10 card-soft p-5">
          <h2 className="text-lg font-bold">Como funciona em 6 passos</h2>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              "Cadastre a empresa (pessoa física ou jurídica) e organize as pastas",
              "Envie o PDF: o sistema calcula o hash de integridade",
              "Veja cada página, arraste e redimensione os campos de assinatura",
              "Envie o link seguro e acompanhe visualizações em tempo real",
              "O signatário assina, envia selfie/documento e confirma localização",
              "Receba o PDF final com evidências, QR Code e verificação pública",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2 text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Smartphone, t: "Feito para o celular", d: "Interface mobile-first, instalável na tela inicial, com notificações push." },
            { icon: Lock, t: "Segurança e LGPD", d: "Armazenamento privado, links assinados, isolamento por conta e trilha de auditoria." },
            { icon: Sparkles, t: "Inteligência jurídica", d: "Auditor de contratos com IA que aponta riscos e sugere cláusulas de proteção." },
          ].map((b) => (
            <article key={b.t} className="card-soft p-4">
              <b.icon className="size-5 text-primary" />
              <h3 className="mt-2 text-sm font-bold">{b.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{b.d}</p>
            </article>
          ))}
        </section>

        <section id="planos" className="mt-10 scroll-mt-20">
          <h2 className="text-xl font-bold tracking-tight">Comece grátis hoje</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua conta em menos de um minuto e envie o primeiro documento para assinatura sem
            cartão de crédito.
          </p>
          <div className="mt-4 card-soft gradient-brand p-5 text-primary-foreground">
            <p className="text-base font-bold">Conta gratuita com fluxo completo de assinatura</p>
            <p className="mt-1 text-xs opacity-90">
              Empresas ilimitadas, pastas, contratos, provas de autoria, PDF assinado e verificação
              pública.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-semibold text-primary"
            >
              Criar minha conta <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">Perguntas frequentes</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <article key={f.q} className="card-soft p-4">
                <h3 className="text-sm font-bold">{f.q}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
              </article>
            ))}
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">IDOC BUSINESS</span>
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/ajuda">Ajuda</Link>
          <Link to="/verify">Verificar documento</Link>
          <a href="/manual-idoc-business.pdf" download="Manual-IDOC-BUSINESS.pdf">Manual em PDF</a>

          <Link to="/auth">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
