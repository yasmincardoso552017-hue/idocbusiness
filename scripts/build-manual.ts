/**
 * Gera public/manual-idoc-business.pdf — manual ilustrado do IDOC BUSINESS.
 * Uso: bun scripts/build-manual.ts
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { writeFileSync } from "node:fs";

const W = 595.28;
const H = 841.89;
const M = 48;
const BRAND = rgb(0.078, 0.353, 0.906);
const DARK = rgb(0.086, 0.11, 0.16);
const GREY = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.87, 0.9);
const SOFT = rgb(0.95, 0.96, 0.99);
const OK = rgb(0.06, 0.6, 0.35);

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

const clean = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

type Ctx = { page: PDFPage; y: number; n: number };
const pages: { title: string; page: number }[] = [];
let ctx: Ctx = { page: pdf.addPage([W, H]), y: H, n: 0 };

function wrap(text: string, f: PDFFont, size: number, max: number) {
  const out: string[] = [];
  let line = "";
  for (const word of clean(text).split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (f.widthOfTextAtSize(test, size) > max) {
      out.push(line);
      line = word;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

function newPage(chapterTitle?: string) {
  ctx.n += 1;
  ctx.page = pdf.addPage([W, H]);
  ctx.y = H - M;
  // topo
  ctx.page.drawRectangle({ x: 0, y: H - 26, width: W, height: 26, color: SOFT });
  ctx.page.drawText("IDOC BUSINESS — Manual prático", { x: M, y: H - 18, size: 8, font, color: GREY });
  const label = `${ctx.n + 2}`;
  ctx.page.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 8), y: H - 18, size: 8, font, color: GREY });
  ctx.y = H - 52;
  if (chapterTitle) ctx.page.drawText("", { x: M, y: ctx.y, size: 1, font });
}

function need(space: number) {
  if (ctx.y - space < M + 20) newPage();
}

function h1(text: string, sub?: string) {
  newPage();
  pages.push({ title: text, page: ctx.n + 1 });
  ctx.page.drawRectangle({ x: M, y: ctx.y - 4, width: 4, height: 22, color: BRAND });
  ctx.page.drawText(clean(text), { x: M + 12, y: ctx.y, size: 17, font: bold, color: DARK });
  ctx.y -= 22;
  if (sub) {
    for (const l of wrap(sub, font, 9.5, W - M * 2 - 12)) {
      ctx.page.drawText(l, { x: M + 12, y: ctx.y, size: 9.5, font, color: GREY });
      ctx.y -= 13;
    }
  }
  ctx.y -= 12;
}

function h2(text: string) {
  need(50);
  ctx.page.drawText(clean(text), { x: M, y: ctx.y, size: 11.5, font: bold, color: BRAND });
  ctx.y -= 17;
}

function p(text: string, size = 9.8) {
  for (const l of wrap(text, font, size, W - M * 2)) {
    need(16);
    ctx.page.drawText(l, { x: M, y: ctx.y, size, font, color: DARK });
    ctx.y -= size * 1.45;
  }
  ctx.y -= 4;
}

function steps(list: string[]) {
  list.forEach((s, i) => {
    const lines = wrap(s, font, 9.8, W - M * 2 - 26);
    need(lines.length * 14 + 8);
    ctx.page.drawCircle({ x: M + 7, y: ctx.y + 3, size: 8, color: BRAND });
    const num = String(i + 1);
    ctx.page.drawText(num, {
      x: M + 7 - bold.widthOfTextAtSize(num, 7.5) / 2,
      y: ctx.y + 0.6,
      size: 7.5,
      font: bold,
      color: rgb(1, 1, 1),
    });
    lines.forEach((l, li) => {
      ctx.page.drawText(l, { x: M + 22, y: ctx.y - li * 13, size: 9.8, font, color: DARK });
    });
    ctx.y -= lines.length * 13 + 7;
  });
  ctx.y -= 3;
}

function bullets(list: string[]) {
  for (const s of list) {
    const lines = wrap(s, font, 9.5, W - M * 2 - 16);
    need(lines.length * 13 + 4);
    ctx.page.drawCircle({ x: M + 3, y: ctx.y + 3, size: 2, color: OK });
    lines.forEach((l, li) =>
      ctx.page.drawText(l, { x: M + 14, y: ctx.y - li * 12.5, size: 9.5, font, color: DARK }),
    );
    ctx.y -= lines.length * 12.5 + 4;
  }
  ctx.y -= 4;
}

function tip(text: string, label = "Dica") {
  const lines = wrap(text, font, 9, W - M * 2 - 24);
  const h = lines.length * 12.5 + 26;
  need(h + 8);
  ctx.page.drawRectangle({ x: M, y: ctx.y - h + 12, width: W - M * 2, height: h, color: SOFT });
  ctx.page.drawRectangle({ x: M, y: ctx.y - h + 12, width: 3, height: h, color: BRAND });
  ctx.page.drawText(label.toUpperCase(), { x: M + 12, y: ctx.y + 2, size: 7.5, font: bold, color: BRAND });
  lines.forEach((l, i) =>
    ctx.page.drawText(l, { x: M + 12, y: ctx.y - 12 - i * 12.5, size: 9, font, color: DARK }),
  );
  ctx.y -= h + 10;
}

/** Ilustração: tela de celular com blocos simulando a interface. */
function screen(caption: string, opts: { rows?: number; header?: string; cta?: string; grid?: boolean } = {}) {
  const w = 250;
  const h = 190;
  need(h + 34);
  const x = (W - w) / 2;
  const y = ctx.y - h;
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1) });
  ctx.page.drawRectangle({ x, y: y + h - 24, width: w, height: 24, color: BRAND });
  ctx.page.drawText(clean(opts.header ?? "IDOC BUSINESS"), {
    x: x + 10,
    y: y + h - 16,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });
  if (opts.grid) {
    let gx = x + 12;
    let gy = y + h - 48;
    for (let i = 0; i < 6; i++) {
      ctx.page.drawRectangle({ x: gx, y: gy - 34, width: 70, height: 34, color: SOFT, borderColor: LINE, borderWidth: 0.6 });
      ctx.page.drawRectangle({ x: gx + 8, y: gy - 14, width: 34, height: 4, color: GREY });
      gx += 78;
      if (i % 3 === 2) {
        gx = x + 12;
        gy -= 42;
      }
    }
  } else {
    let ry = y + h - 40;
    for (let i = 0; i < (opts.rows ?? 4); i++) {
      ctx.page.drawRectangle({ x: x + 12, y: ry - 22, width: w - 24, height: 22, color: SOFT, borderColor: LINE, borderWidth: 0.6 });
      ctx.page.drawRectangle({ x: x + 20, y: ry - 14, width: 90, height: 5, color: GREY });
      ctx.page.drawRectangle({ x: w + x - 46, y: ry - 15, width: 26, height: 8, color: BRAND });
      ry -= 28;
    }
  }
  ctx.page.drawRectangle({ x: x + 12, y: y + 12, width: w - 24, height: 20, color: BRAND });
  const cta = clean(opts.cta ?? "Continuar");
  ctx.page.drawText(cta, {
    x: x + w / 2 - bold.widthOfTextAtSize(cta, 8) / 2,
    y: y + 18,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });
  ctx.y = y - 6;
  const cap = `Figura: ${caption}`;
  for (const l of wrap(cap, oblique, 8, W - M * 2)) {
    ctx.page.drawText(l, { x: (W - oblique.widthOfTextAtSize(l, 8)) / 2, y: ctx.y, size: 8, font: oblique, color: GREY });
    ctx.y -= 11;
  }
  ctx.y -= 10;
}

/** Ilustração: documento com campo de assinatura marcado. */
function docFigure(caption: string) {
  const w = 200;
  const h = 250;
  need(h + 34);
  const x = (W - w) / 2;
  const y = ctx.y - h;
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1) });
  for (let i = 0; i < 12; i++) {
    ctx.page.drawRectangle({
      x: x + 16,
      y: y + h - 30 - i * 14,
      width: w - 32 - (i % 3) * 22,
      height: 4,
      color: rgb(0.87, 0.89, 0.92),
    });
  }
  ctx.page.drawRectangle({ x: x + 24, y: y + 44, width: 120, height: 34, borderColor: BRAND, borderWidth: 1.2, color: rgb(0.94, 0.96, 1) });
  ctx.page.drawText("Assinatura aqui", { x: x + 34, y: y + 57, size: 7.5, font: bold, color: BRAND });
  ctx.page.drawRectangle({ x: x + 24, y: y + 24, width: 150, height: 4, color: rgb(0.87, 0.89, 0.92) });
  ctx.y = y - 6;
  const cap = `Figura: ${caption}`;
  ctx.page.drawText(cap, { x: (W - oblique.widthOfTextAtSize(cap, 8)) / 2, y: ctx.y, size: 8, font: oblique, color: GREY });
  ctx.y -= 20;
}

// ---------------------------------------------------------------- capa
const cover = pdf.addPage([W, H]);
cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BRAND });
cover.drawRectangle({ x: 0, y: 0, width: W, height: 210, color: rgb(1, 1, 1) });
cover.drawText("IDOC", { x: M, y: H - 210, size: 62, font: bold, color: rgb(1, 1, 1) });
cover.drawText("BUSINESS", { x: M, y: H - 275, size: 40, font: bold, color: rgb(0.85, 0.9, 1) });
cover.drawText("Manual prático ilustrado", { x: M, y: H - 340, size: 20, font: bold, color: rgb(1, 1, 1) });
for (const [i, l] of wrap(
  "Documentos, contratos e assinaturas eletrônicas com validade jurídica. Guia completo, passo a passo, de todas as áreas e ferramentas do sistema.",
  font,
  11,
  W - M * 2 - 60,
).entries()) {
  cover.drawText(l, { x: M, y: H - 370 - i * 16, size: 11, font, color: rgb(0.9, 0.94, 1) });
}
const highlights = [
  "Empresas, pastas e subpastas com SKU compartilhável",
  "Assinatura com posicionamento de campos no PDF",
  "Exigências por signatário: localização, documento e selfie",
  "Envelopes de contrato com trilha de auditoria",
  "28 ferramentas de PDF que rodam no seu dispositivo",
  "Auditor jurídico com inteligência artificial",
  "Lembretes e notificações na tela inicial",
];
highlights.forEach((t, i) => {
  cover.drawCircle({ x: M + 4, y: 168 - i * 20 + 3, size: 3, color: BRAND });
  cover.drawText(clean(t), { x: M + 16, y: 168 - i * 20, size: 10, font, color: DARK });
});
cover.drawText("Edição 2026 — versão completa", { x: M, y: 26, size: 9, font: bold, color: GREY });

// ------------------------------------------------------- capítulos
h1("1. Primeiros passos e instalação", "Criar a conta, entrar com Google e instalar o aplicativo no celular.");
steps([
  "Abra o site do IDOC BUSINESS e toque em Entrar. Você pode criar conta com e-mail e senha ou entrar direto com sua conta Google.",
  "Se usar e-mail e senha, confirme o cadastro pelo link enviado à sua caixa de entrada.",
  "Esqueceu a senha? Use Esqueci minha senha na tela de acesso para receber o link de redefinição.",
  "Na página inicial, toque em Instalar aplicativo para adicionar o IDOC BUSINESS à tela do celular, com a logo do sistema.",
  "No iPhone (Safari), toque em Compartilhar e depois em Adicionar à Tela de Início.",
  "Depois de entrar você cai direto no painel, com atalhos para todas as áreas.",
]);
screen("painel inicial com atalhos das principais áreas", { header: "Painel", grid: true, cta: "Abrir empresa" });
tip("O aplicativo instalado abre em tela cheia, guarda sua sessão e recebe as notificações de lembrete mesmo fechado.");

h1("2. Empresas: o centro de tudo", "Cada empresa é um espaço de trabalho isolado, com pastas, documentos e contratos próprios.");
steps([
  "Vá em Empresas e toque em Nova empresa.",
  "Escolha Pessoa física ou Pessoa jurídica — os campos mudam conforme a escolha (CPF ou CNPJ, razão social, nome fantasia).",
  "Preencha contato, e-mail, telefone e endereço. Esses dados aparecem nos contratos e nos relatórios.",
  "Toque na empresa para abrir o espaço de trabalho: pastas, documentos, contratos, assinados e histórico.",
  "Para corrigir dados, use Editar empresa. Para remover, use Excluir — há dupla confirmação, porque a exclusão apaga também pastas e documentos.",
]);
screen("espaço de trabalho da empresa com abas de pastas, contratos e assinados", { header: "Empresa", rows: 4, cta: "Enviar documento" });
tip("Tudo — envio, organização, contratos e coleta de assinaturas — acontece dentro da empresa selecionada. Assim nada se mistura entre clientes.");

h1("3. Pastas, subpastas e envio de documentos", "Organização em árvore, com envio direto para a pasta certa.");
steps([
  "Dentro da empresa, abra Pastas e toque em Nova pasta. Para criar uma subpasta, abra a pasta e crie outra dentro dela.",
  "Toque em Enviar documento. No mesmo painel você escolhe a empresa, a pasta ou subpasta, o nome do arquivo e seleciona o arquivo.",
  "Confirme o envio. Ao terminar, o sistema abre a pasta de destino já com o documento visível.",
  "Aceita PDF, Word, Excel, PowerPoint, imagens, TXT, CSV e ZIP, com até 2 GB por arquivo.",
  "Em cada documento você escolhe o que fazer: assinar, enviar para assinatura, editar, baixar, mover ou excluir.",
  "Use Baixar pasta em ZIP para levar todos os arquivos organizados de uma vez.",
]);
screen("árvore de pastas com documentos e ações do arquivo", { header: "Pastas", rows: 5, cta: "Enviar documento" });
tip("Os arquivos ficam em armazenamento privado. Todo acesso usa link temporário assinado — ninguém abre um documento sem permissão.");

h1("4. Compartilhar pasta por SKU", "Trabalhe em conjunto em uma pasta específica, sem abrir o resto da conta.");
steps([
  "Cada pasta e subpasta criada recebe um código único no formato IDOC-XXXX-XXXX.",
  "Copie o SKU da pasta e envie para a pessoa com quem você quer trabalhar.",
  "A outra pessoa entra em Pastas compartilhadas, cola o SKU e ativa o acesso.",
  "Escolha se o convidado pode apenas visualizar ou também enviar arquivos dentro da pasta.",
  "A pasta passa a aparecer na conta do convidado em tempo real, com o conteúdo e as subpastas.",
  "Quem é dono vê a lista de quem está usando o SKU e pode revogar a qualquer momento — o acesso cai na hora.",
]);
screen("área Pastas compartilhadas com campo para colar o SKU", { header: "Compartilhadas", rows: 3, cta: "Ativar acesso" });
tip("O convidado só alcança aquela pasta e o que está dentro dela. Nenhuma outra empresa, pasta ou contrato fica visível.", "Segurança");

h1("5. Preparar o documento para assinatura", "Ver cada página, marcar onde vai a assinatura e ajustar com precisão.");
steps([
  "No documento PDF, escolha Enviar para assinatura.",
  "Adicione os signatários: nome, e-mail e, se quiser, telefone. Escolha ordem sequencial (um após o outro) ou paralela (todos ao mesmo tempo).",
  "Selecione o signatário na lista e clique na página, no lugar exato onde a assinatura deve ficar.",
  "Arraste o campo para mover, use as alças para redimensionar e o zoom (100% a 400%) para posicionar com precisão. Arraste a página para navegar.",
  "Adicione outros campos quando precisar: nome completo, CPF, data ou texto livre.",
  "Defina o prazo de validade do link e confirme o envio para gerar os links seguros de cada pessoa.",
]);
docFigure("campo de assinatura posicionado na página do PDF");
tip("A assinatura é aplicada sempre na horizontal, proporcional e centralizada no campo marcado — inclusive em páginas giradas.");

h1("6. Exigências por signatário", "Você decide o que cada pessoa precisa apresentar.");
p("Antes de enviar, e também depois na tela de preparação, cada signatário tem seus próprios controles. É possível pedir uma coisa de um e outra de outro.");
bullets([
  "Localização em tempo real: registra a posição aproximada no momento da assinatura.",
  "Documento com foto: a pessoa fotografa ou envia RG, CNH ou passaporte.",
  "Selfie: foto do rosto no momento da assinatura, para conferência com o documento.",
  "Nome completo digitado: confirmação por escrito de quem assina.",
]);
p("Quem não recebeu uma exigência não é incomodado com ela — o link pede somente o que foi marcado para aquela pessoa.");
tip("No iPhone, a autorização de localização só aparece após um toque na tela. Se você recusou antes, libere em Ajustes > Safari > Localização e toque em Tentar novamente.");

h1("7. Como o cliente assina pelo link", "Experiência simples no celular, sem instalar nada.");
steps([
  "A pessoa recebe o link seguro e abre no celular ou computador.",
  "Ela vê a prévia de todas as páginas do documento antes de qualquer coisa.",
  "Cumpre o que foi exigido: autoriza a localização, tira a selfie e fotografa o documento (câmera ou upload).",
  "Assina desenhando com o dedo ou digitando o nome, escolhendo o estilo.",
  "Aceita os termos e confirma. O PDF final assinado é gerado na hora, com download em PDF.",
  "No fim aparece o convite para entrar com a conta Google e acessar o contrato pelo aplicativo, vendo somente os documentos dela.",
]);
screen("tela pública de assinatura com prévia e área de desenho", { header: "Assinar documento", rows: 3, cta: "Assinar e concluir" });

h1("8. Envelopes de contrato: enviar e acompanhar", "Controle completo do ciclo de vida, do rascunho à conclusão.");
p("Em Contratos você acompanha cada envelope pelos estados: rascunho, enviado, entregue, assinado, concluído — além de cancelado, expirado e recusado.");
bullets([
  "Filtros e etiquetas de situação para achar rápido o que está pendente.",
  "Linha do tempo com cada evento: envio, abertura, assinatura, conclusão.",
  "Reenviar o link para quem não assinou e cancelar quando o contrato não vale mais.",
  "Prazo de expiração e ordem de assinatura definidos por você.",
  "Download do PDF final e conclusão automática quando todos assinam.",
]);
screen("lista de envelopes com situação e linha do tempo", { header: "Contratos", rows: 5, cta: "Novo envelope" });

h1("9. Lembretes e notificações", "Você define quando cada pessoa é avisada.");
steps([
  "Abra Lembretes (também há atalho no painel inicial).",
  "Escolha o documento, o signatário e defina a data e a hora da notificação.",
  "Salve. Na hora marcada a notificação chega na barra de notificações da pessoa, mesmo com o aplicativo fechado.",
  "Precisa avisar agora? Use Notificar agora e a notificação é enviada imediatamente.",
  "Permita as notificações no navegador na primeira vez para que os avisos cheguem.",
]);
tip("Quem envia o documento é quem programa os avisos. Use lembretes um dia antes do prazo para aumentar a taxa de assinatura.");

h1("10. Ferramentas de PDF — Organizar", "Junte, divida e reorganize sem enviar nada para a internet.");
p("Todas as ferramentas rodam no seu próprio dispositivo. Nada é salvo nem baixado automaticamente: você visualiza, escolhe as páginas, dá o nome e só então exporta.");
bullets([
  "Juntar PDFs: some vários arquivos em um só, na ordem que preferir.",
  "Dividir em arquivos: cada página (ou intervalo) vira um PDF separado, entregue em ZIP.",
  "Extrair páginas: monte um novo documento só com as páginas escolhidas.",
  "Reordenar páginas: arraste as miniaturas até a ordem certa.",
  "Excluir páginas: remova o que não deve ficar no documento.",
  "Girar páginas: corrija páginas de lado ou de cabeça para baixo.",
  "Marca d'água: texto sobreposto, com transparência e posição.",
  "Numerar páginas: numeração automática no rodapé.",
]);
screen("bancada com miniaturas, seleção de páginas e nome do arquivo", { header: "Ferramentas", grid: true, cta: "Salvar e baixar" });
tip("Na bancada você escolhe o nome do arquivo e o formato de saída: PDF único, ZIP de PDFs ou imagens PNG, JPG e WEBP.");

h1("11. Ferramentas de PDF — Converter", "Entre PDF e os formatos do dia a dia.");
bullets([
  "PDF para Word: texto editável, página por página.",
  "PDF para Excel: linhas e colunas separadas em planilha, uma aba por página.",
  "PDF para PowerPoint: cada página vira um slide.",
  "PDF para JPG ou PNG: imagens em alta, uma por página.",
  "JPG para PDF: fotos e digitalizações reunidas em um PDF.",
  "Word, Excel, PowerPoint, HTML e TXT para PDF: envio do arquivo e saída em PDF A4 paginado.",
  "PDF para PDF/A: formato de arquivamento de longo prazo (2B ou 3B).",
]);
tip("Documento gerado por foto ou digitalização não tem texto. Passe primeiro pelo OCR (capítulo 14) e depois converta.");

h1("12. Ferramentas de PDF — Editar e formulários", "Mexa no conteúdo antes de enviar.");
steps([
  "Abra Editor completo e escolha o PDF.",
  "Adicione texto, imagens, formas, destaques e desenhos livres em qualquer página.",
  "Clique num elemento para mover, redimensionar, trocar cor ou apagar.",
  "Use Preencher formulários para completar campos de PDFs preenchíveis.",
  "Marque a opção de achatar para que os campos preenchidos não possam mais ser alterados.",
  "Revise as páginas e exporte com o nome que quiser.",
]);
screen("editor com texto, imagem e destaque sobre a página", { header: "Editor", rows: 4, cta: "Exportar PDF" });

h1("13. Ferramentas de PDF — Segurança e otimização", "Senha, dados sigilosos e arquivos leves.");
bullets([
  "Colocar senha: define senha de abertura e senha de permissões.",
  "Remover senha: abre com a senha que você conhece e devolve o arquivo livre.",
  "Redigir dados: cobre trechos sigilosos de forma definitiva — o texto por baixo deixa de existir.",
  "Comprimir PDF: três níveis (leve, média, forte) para caber em e-mail e WhatsApp.",
  "Tratar documento: envie PDF, JPG, PNG ou WEBP e escolha o modo conservador, equilibrado ou intenso para limpar fundo, sombras, ruídos e manchas leves.",
  "O tratamento melhora a nitidez de letras, números e códigos de barras sem recriar, apagar ou mudar o conteúdo original.",
]);
steps([
  "Abra Tratar documento na categoria Otimização e selecione o PDF ou a imagem escaneada.",
  "Escolha o nível de tratamento. Comece pelo modo conservador quando o documento tiver carimbos, assinaturas ou marcas importantes.",
  "Aguarde o processamento página por página e confira todas as miniaturas na prévia.",
  "Reorganize ou gire páginas se precisar, defina o nome e baixe o novo PDF tratado.",
]);
tip("Guarde a senha em lugar seguro. Sem ela, nem você nem o suporte conseguem abrir o arquivo protegido.", "Atenção");

h1("14. OCR, texto e pacotes ZIP", "Transforme digitalizações em documentos pesquisáveis.");
steps([
  "Abra PDF pesquisável e escolha o arquivo digitalizado ou fotografado.",
  "Aguarde o reconhecimento de texto — o documento passa a permitir busca por qualquer palavra.",
  "Use Extrair texto quando quiser apenas o conteúdo escrito, para copiar ou revisar.",
  "Use Pasta ZIP para reunir imagens, documentos e PDFs em um único pacote organizado.",
]);

h1("15. Auditor jurídico com inteligência artificial", "Uma segunda leitura do contrato antes de assinar.");
steps([
  "Abra Auditor jurídico e envie o contrato em PDF ou TXT. Se for digitalizado, o texto é reconhecido automaticamente.",
  "A análise lê o documento inteiro e identifica o tipo de contrato, as partes e o objeto.",
  "Você recebe o nível de risco, o resumo, os problemas por cláusula com o trecho citado, a base legal e sugestões de redação.",
  "Veja também as cláusulas ausentes, o checklist de conferência e as recomendações finais.",
  "Faça perguntas em linguagem natural sobre o documento e consulte o histórico das auditorias.",
]);
tip("A auditoria é informativa e não altera o arquivo original nem substitui a orientação de um advogado.", "Importante");

h1("16. Verificação pública e evidências", "Como qualquer pessoa comprova a autenticidade.");
p("Todo documento finalizado recebe um código de verificação, um QR Code, rodapé em todas as páginas e uma página de evidências anexada ao PDF final.");
bullets([
  "Nome, e-mail e aceite dos termos de cada signatário.",
  "Data e hora, endereço IP, dispositivo e navegador.",
  "Localização aproximada, selfie e documento com foto, quando exigidos.",
  "Hash SHA-256 do arquivo original e do PDF final assinado.",
]);
steps([
  "Abra a página /verify no site.",
  "Digite o código de verificação impresso no rodapé do documento ou leia o QR Code.",
  "Confira a situação do documento e o resumo das evidências, sem expor dados pessoais completos.",
]);
screen("página pública de verificação por código", { header: "Verificar documento", rows: 2, cta: "Verificar" });

h1("17. Segurança, LGPD e painel do administrador", "Controles de acesso e trilha imutável.");
bullets([
  "Armazenamento privado com links temporários assinados.",
  "Isolamento por usuário e por empresa direto no banco de dados.",
  "Trilha de auditoria somente leitura, sem edição nem exclusão, exportável em CSV.",
  "Áreas internas fechadas para quem não está autenticado.",
  "Conta mestre com painel de gestão: lista de cadastros, criação e bloqueio de usuários.",
]);
p("Você é o controlador dos documentos enviados e o IDOC BUSINESS atua como operador. Titulares podem pedir acesso, correção ou eliminação, exceto dados necessários à validade jurídica de assinaturas já concluídas.");

h1("18. Fluxo completo em 10 passos", "O caminho recomendado do começo ao fim.");
steps([
  "Crie a conta e instale o aplicativo.",
  "Cadastre a empresa (pessoa física ou jurídica).",
  "Monte as pastas e subpastas do cliente.",
  "Envie o documento direto para a pasta certa.",
  "Confira o contrato no Auditor jurídico.",
  "Adicione os signatários e defina ordem e prazo.",
  "Marque a posição das assinaturas em cada página.",
  "Escolha as exigências de cada signatário e envie os links.",
  "Programe lembretes e acompanhe o envelope até a conclusão.",
  "Baixe o PDF final assinado, guarde em Assinados e divulgue o código de verificação.",
]);

h1("19. Perguntas frequentes", "Respostas rápidas para as dúvidas mais comuns.");
const faq: [string, string][] = [
  ["O documento não aparece na pasta", "Confirme se você escolheu a empresa e a pasta no painel de envio. Depois do envio o sistema abre a pasta de destino já com o arquivo."],
  ["Posso assinar sem instalar nada?", "Sim. O signatário assina pelo link, no navegador do celular ou do computador."],
  ["Qual o tamanho máximo de arquivo?", "Até 2 GB por arquivo, em PDF, Office, imagens, TXT, CSV e ZIP."],
  ["A localização não é liberada no iPhone", "Toque no botão de autorizar (a permissão só surge após o toque) e, se já recusou, libere em Ajustes > Safari > Localização."],
  ["Como tirar o acesso de quem tem meu SKU?", "Na pasta, veja a lista de convidados e toque em revogar. O acesso cai imediatamente."],
  ["As ferramentas enviam meus arquivos para a internet?", "Não. Elas rodam no seu dispositivo e só geram o download quando você manda salvar."],
  ["Perdi o código de verificação", "Ele está no rodapé de todas as páginas do PDF final e também na aba Assinaturas do documento."],
];
for (const [q, a] of faq) {
  need(50);
  ctx.page.drawText(clean(q), { x: M, y: ctx.y, size: 10, font: bold, color: DARK });
  ctx.y -= 14;
  p(a, 9.3);
}
tip("Ainda com dúvida? Escreva para suporte@docflow.app informando o nome do documento e o código de verificação, se houver.", "Suporte");

// remove a página vazia criada na inicialização do contexto
pdf.removePage(0);

// ------------------------------------------------------- sumário (página 2)
const toc = pdf.insertPage(1, [W, H]);
toc.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: SOFT });
toc.drawText("Sumário", { x: M, y: H - 58, size: 24, font: bold, color: DARK });
toc.drawText(clean("Manual prático ilustrado do IDOC BUSINESS — edição completa"), {
  x: M,
  y: H - 78,
  size: 9.5,
  font,
  color: GREY,
});
let ty = H - 125;
for (const item of pages) {
  const label = clean(item.title);
  toc.drawText(label, { x: M, y: ty, size: 10.5, font, color: DARK });
  const num = String(item.page + 1);
  const start = M + font.widthOfTextAtSize(label, 10.5) + 6;
  const end = W - M - 18;
  for (let dx = start; dx < end; dx += 4) {
    toc.drawCircle({ x: dx, y: ty + 3, size: 0.5, color: LINE });
  }
  toc.drawText(num, { x: W - M - bold.widthOfTextAtSize(num, 10.5), y: ty, size: 10.5, font: bold, color: BRAND });
  ty -= 22;
}
toc.drawText(clean("Cada capítulo traz passos numerados, ilustrações da tela e dicas práticas."), {
  x: M,
  y: 40,
  size: 9,
  font: oblique,
  color: GREY,
});

writeFileSync("public/manual-idoc-business.pdf", await pdf.save());
console.log("manual gerado", pdf.getPageCount(), "páginas");
