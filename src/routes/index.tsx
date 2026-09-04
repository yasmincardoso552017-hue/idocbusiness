import { Brand } from "@/components/Brand";
import { InstallAppButton } from "@/components/InstallAppButton";
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
    t: "Organizar PDFs",
    items: ["Juntar vários PDFs", "Dividir e extrair páginas", "Reordenar e excluir páginas", "Girar páginas"],
  },
  {
    icon: RefreshCw,
    t: "Converter arquivos",
    items: ["PDF para Word, Excel e PowerPoint", "PDF para JPG e JPG para PDF", "Word, Excel, PPT e HTML para PDF", "PDF/A para arquivamento"],
  },
  {
    icon: PencilRuler,
    t: "Editar PDF",
    items: ["Adicionar textos e imagens", "Formas, destaques e anotações", "Desenhar à mão", "Preencher formulários"],
  },
  {
    icon: PenLine,
    t: "Assinatura",
    items: ["Assinar você mesmo", "Solicitar assinaturas de outras pessoas", "Campos de assinatura, inicial e texto"],
  },
  {
    icon: Lock,
    t: "Segurança",
    items: ["Colocar senha e criptografar", "Remover senha quando possível", "Redigir dados sensíveis"],
  },
  {
    icon: Gauge,
    t: "Otimização",
    items: ["Comprimir PDF", "Reduzir para enviar por e-mail e WhatsApp", "Três níveis de compressão"],
  },
  {
    icon: ScanText,
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
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Brand className="h-7 flex-1" />
          <a href="#recursos" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Recursos
          </a>
          <a href="#ferramentas" className="hidden text-xs font-medium text-muted-foreground sm:block">
            Ferramentas
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

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-10 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> MP 2.200-2/2001 • Lei 14.063/2020 • LGPD
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Assinatura eletrônica e gestão de contratos para a sua empresa
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            O IDOC BUSINESS centraliza documentos de todas as suas empresas, envia contratos para
            assinatura em minutos, coleta provas de autoria completas (IP, dispositivo, localização,
            documento com foto e selfie) e entrega um PDF final assinado com página de evidências e
            verificação pública.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Criar conta grátis <ArrowRight className="size-4" />
            </Link>
            <InstallAppButton className="px-5 py-3" />
            <a
              href="/manual-idoc-business.pdf"
              download="Manual-IDOC-BUSINESS.pdf"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary"
            >
              <BookOpen className="size-4" /> Baixar manual ilustrado (PDF)
            </a>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-xl border border-input px-5 py-3 text-sm font-semibold"
            >
              Verificar documento
            </Link>

          </div>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sem instalação", "Funciona no navegador e como app"],
              ["Provas completas", "Trilha de auditoria imutável"],
              ["Multiempresa", "PF e PJ na mesma conta"],
              ["Verificação pública", "Código + hash SHA-256"],
            ].map(([t, d]) => (
              <div key={t} className="card-soft p-3">
                <dt className="text-xs font-bold">{t}</dt>
                <dd className="mt-1 text-[11px] text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="recursos" className="scroll-mt-20">
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

        <section id="ferramentas" className="mt-10 scroll-mt-20">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Central completa de ferramentas de PDF</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Organize, converta, edite, assine, proteja, comprima e reconheça texto — tudo no navegador, com
            pré-visualização e escolha do nome e do formato antes de baixar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {toolCategories.map((c) => (
              <article key={c.t} className="card-soft p-4">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="size-4" />
                </div>
                <h3 className="text-sm font-bold">{c.t}</h3>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.items.map((i) => (
                    <li key={i} className="flex gap-1.5">
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" /> {i}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
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
      </main>

      <footer className="border-t border-border px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">IDOC BUSINESS</span>
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/ajuda">Ajuda</Link>
          <Link to="/verify">Verificar documento</Link>
          <Link to="/auth">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
