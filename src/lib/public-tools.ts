import toolCompress from "@/assets/tool-compress.jpg";
import toolConvert from "@/assets/tool-convert.jpg";
import toolEdit from "@/assets/tool-edit.jpg";
import toolEnhance from "@/assets/tool-enhance-document.jpg";
import toolOcr from "@/assets/tool-ocr.jpg";
import toolOrganize from "@/assets/tool-organize.jpg";
import toolSecurity from "@/assets/tool-security.jpg";
import toolSign from "@/assets/tool-sign.jpg";
import type { LucideIcon } from "lucide-react";
import { Combine, FilePenLine, FileSearch, Gauge, LockKeyhole, RefreshCw, ScanLine, Scissors, Signature } from "lucide-react";

export type PublicToolSlug =
  | "juntar-pdf"
  | "dividir-pdf"
  | "comprimir-pdf"
  | "editar-pdf"
  | "converter-pdf"
  | "assinar-pdf"
  | "proteger-pdf"
  | "pdf-pesquisavel"
  | "tratar-documento";

export type PublicTool = {
  slug: PublicToolSlug;
  appTool: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  iconClass: string;
  formats: string;
  benefits: string[];
  steps: string[];
  useCases: string[];
  faq: { question: string; answer: string }[];
  related: PublicToolSlug[];
};

export const publicTools: Record<PublicToolSlug, PublicTool> = {
  "juntar-pdf": {
    slug: "juntar-pdf",
    appTool: "merge",
    eyebrow: "Organizar PDF",
    title: "Juntar PDF grátis e organizar páginas online",
    shortTitle: "Juntar PDF",
    description: "Junte vários PDFs e documentos em um único arquivo, organize a ordem e confira todas as páginas antes de baixar.",
    intro: "Reúna contratos, comprovantes, trabalhos e anexos em um único PDF. Adicione arquivos em vários lotes, ajuste a ordem e revise o resultado antes de salvar.",
    image: toolOrganize,
    imageAlt: "Páginas de documentos sendo organizadas para juntar em um único PDF",
    icon: Combine,
    iconClass: "bg-tool-organize",
    formats: "PDF, JPG, PNG, Word, Excel, PowerPoint, HTML e TXT compatíveis com a conversão.",
    benefits: ["Adicione vários arquivos de pastas diferentes", "Mantenha a ordem escolhida", "Recupere PDFs difíceis antes da união", "Revise as páginas antes do download"],
    steps: ["Selecione dois ou mais arquivos", "Confira a fila e reorganize o conteúdo", "Visualize o PDF combinado", "Escolha o nome e baixe"],
    useCases: ["Unir capítulos de um trabalho", "Agrupar notas e comprovantes", "Montar um contrato com anexos"],
    faq: [
      { question: "Posso juntar vários PDFs de uma vez?", answer: "Sim. Você pode selecionar vários arquivos e adicionar novos lotes de outras pastas, mantendo a ordem desejada." },
      { question: "Consigo conferir antes de baixar?", answer: "Sim. O resultado abre para revisão das páginas antes de você definir o nome e fazer o download." },
      { question: "O PDF perde qualidade?", answer: "A ferramenta preserva o conteúdo original sempre que possível e recupera visualmente páginas incompatíveis quando necessário." },
    ],
    related: ["dividir-pdf", "comprimir-pdf", "editar-pdf"],
  },
  "dividir-pdf": {
    slug: "dividir-pdf", appTool: "burst", eyebrow: "Organizar PDF", title: "Dividir PDF grátis e extrair páginas online", shortTitle: "Dividir PDF",
    description: "Separe um PDF em arquivos menores ou extraia somente as páginas necessárias, com visualização antes de baixar.",
    intro: "Transforme um documento grande em arquivos menores, retire um intervalo específico ou salve páginas selecionadas sem refazer o documento.",
    image: toolOrganize, imageAlt: "Documento PDF dividido em páginas organizadas", icon: Scissors, iconClass: "bg-tool-organize",
    formats: "Arquivos PDF, inclusive documentos com páginas em tamanhos e orientações diferentes.",
    benefits: ["Divisão página por página", "Extração por intervalos", "Seleção visual das páginas", "Download organizado em PDF ou ZIP"],
    steps: ["Escolha o arquivo PDF", "Selecione páginas ou intervalos", "Confira a ordem e a prévia", "Defina o nome e baixe"],
    useCases: ["Separar anexos de um contrato", "Extrair páginas de um processo", "Dividir apostilas e relatórios"],
    faq: [
      { question: "Posso extrair apenas algumas páginas?", answer: "Sim. Informe páginas e intervalos, como 1-3, 7 e 10-12, e revise o resultado antes de baixar." },
      { question: "As páginas originais são alteradas?", answer: "Não. O arquivo original permanece intacto; um novo documento é gerado com a seleção escolhida." },
      { question: "É possível baixar cada página separada?", answer: "Sim. A divisão pode gerar PDFs individuais reunidos em um arquivo ZIP." },
    ], related: ["juntar-pdf", "editar-pdf", "comprimir-pdf"],
  },
  "comprimir-pdf": {
    slug: "comprimir-pdf", appTool: "compress", eyebrow: "Otimizar PDF", title: "Comprimir PDF grátis para e-mail e WhatsApp", shortTitle: "Comprimir PDF",
    description: "Reduza o tamanho de PDFs para enviar por e-mail, WhatsApp e portais, escolhendo o equilíbrio entre tamanho e qualidade.",
    intro: "Quando o documento ultrapassa o limite de envio, use três níveis de compressão e confira o resultado antes de baixar a versão menor.",
    image: toolCompress, imageAlt: "Indicador profissional de redução do tamanho de um arquivo PDF", icon: Gauge, iconClass: "bg-tool-optimize",
    formats: "PDFs digitais, digitalizados, com imagens, relatórios, currículos e documentos administrativos.",
    benefits: ["Três níveis de compressão", "Prévia antes do download", "Útil para WhatsApp e e-mail", "Nome do arquivo personalizado"],
    steps: ["Envie o PDF", "Escolha compressão leve, média ou forte", "Confira qualidade e tamanho", "Baixe a versão otimizada"],
    useCases: ["Enviar documentos pelo WhatsApp", "Adequar anexos a portais", "Reduzir currículos e apresentações"],
    faq: [
      { question: "A compressão reduz a qualidade?", answer: "Quanto maior a compressão, maior pode ser a redução visual. Por isso você escolhe o nível e revisa antes de baixar." },
      { question: "Serve para PDF digitalizado?", answer: "Sim. Documentos com imagens costumam oferecer maior possibilidade de redução." },
      { question: "Consigo usar no celular?", answer: "Sim. A ferramenta funciona pelo navegador em celular, tablet e computador." },
    ], related: ["tratar-documento", "converter-pdf", "pdf-pesquisavel"],
  },
  "editar-pdf": {
    slug: "editar-pdf", appTool: "editor", eyebrow: "Editar documentos", title: "Editar PDF grátis com texto, imagem e desenho", shortTitle: "Editar PDF",
    description: "Edite PDF online adicionando textos, imagens, formas, destaques e desenhos, com controle visual página por página.",
    intro: "Faça correções e anotações sem recriar o arquivo. Posicione elementos diretamente sobre cada página e revise o documento antes de baixar.",
    image: toolEdit, imageAlt: "Documento PDF sendo editado com lápis e elementos visuais", icon: FilePenLine, iconClass: "bg-tool-edit",
    formats: "Arquivos PDF com páginas em diferentes tamanhos e orientações.",
    benefits: ["Textos e imagens posicionáveis", "Formas e destaques", "Desenho à mão livre", "Prévia fiel das páginas"],
    steps: ["Abra o PDF", "Escolha texto, imagem, forma ou desenho", "Posicione e ajuste o elemento", "Revise e baixe o novo PDF"],
    useCases: ["Corrigir observações em contratos", "Destacar trechos importantes", "Adicionar carimbos e imagens"],
    faq: [
      { question: "Posso alterar o texto original do PDF?", answer: "Você pode acrescentar, cobrir, destacar e anotar visualmente. A edição depende de como o PDF original foi criado." },
      { question: "Dá para desenhar uma assinatura?", answer: "Sim. O editor permite desenho livre; para coleta formal com evidências, use a área de assinatura eletrônica." },
      { question: "Posso editar pelo celular?", answer: "Sim. A interface se adapta ao celular, embora ajustes precisos sejam mais confortáveis em telas maiores." },
    ], related: ["assinar-pdf", "proteger-pdf", "juntar-pdf"],
  },
  "converter-pdf": {
    slug: "converter-pdf", appTool: "pdf2word", eyebrow: "Converter arquivos", title: "Converter PDF grátis para Word, Excel, JPG e mais", shortTitle: "Converter PDF",
    description: "Converta PDF para Word, Excel, PowerPoint, JPG ou PNG com modo visual fiel, sem desorganizar páginas, tabelas e imagens.",
    intro: "Escolha o formato desejado. Nas conversões para Word, Excel e PowerPoint, cada página preserva integralmente a aparência, as posições e as proporções do PDF original.",
    image: toolConvert, imageAlt: "Arquivos de diferentes formatos sendo convertidos para PDF", icon: RefreshCw, iconClass: "bg-tool-convert",
    formats: "PDF, DOCX, XLSX, PPTX, JPG, PNG, HTML e TXT, conforme a conversão escolhida.",
    benefits: ["Layout visual fiel ao PDF original", "PDF para Word, Excel e PowerPoint", "PDF para JPG ou PNG", "Imagens e Office para PDF"],
    steps: ["Escolha a conversão", "Selecione o arquivo compatível", "Confira as opções e o resultado", "Defina o nome e baixe"],
    useCases: ["Editar conteúdo no Word", "Reaproveitar tabelas no Excel", "Criar PDF a partir de imagens"],
    faq: [
      { question: "A formatação fica igual ao original?", answer: "Sim, no modo fiel. Cada página é preservada como uma imagem integral, mantendo textos, tabelas, imagens e posições. Por isso, esses elementos não ficam livremente editáveis no arquivo convertido." },
      { question: "Quais formatos posso converter?", answer: "Há opções para Word, Excel, PowerPoint, JPG, PNG, HTML, TXT, PDF e PDF/A." },
      { question: "Posso converter várias imagens em um PDF?", answer: "Sim. Selecione várias imagens, ajuste a ordem e gere um único PDF." },
    ], related: ["pdf-pesquisavel", "editar-pdf", "comprimir-pdf"],
  },
  "assinar-pdf": {
    slug: "assinar-pdf", appTool: "sign", eyebrow: "Assinatura eletrônica", title: "Assinar PDF online com evidências e validade jurídica", shortTitle: "Assinar PDF",
    description: "Assine PDF online ou solicite assinaturas com campos posicionados, links individuais e relatório de evidências.",
    intro: "Assine por conta própria ou envie o documento para várias pessoas. Cada signatário recebe seu link e pode cumprir exigências individuais de localização, documento e selfie.",
    image: toolSign, imageAlt: "Documento digital recebendo uma assinatura eletrônica", icon: Signature, iconClass: "bg-tool-sign",
    formats: "Documentos PDF preparados para assinatura simples, sequencial ou paralela.",
    benefits: ["Assinatura desenhada ou digitada", "Campos no local exato", "Múltiplos signatários", "PDF final com evidências e verificação"],
    steps: ["Envie o PDF dentro da empresa", "Adicione signatários e exigências", "Posicione cada campo", "Envie links e acompanhe até concluir"],
    useCases: ["Contratos comerciais", "Autorizações e termos", "Acordos com várias partes"],
    faq: [
      { question: "A assinatura eletrônica tem validade jurídica?", answer: "A validade depende do contexto e das evidências. O IDOC registra aceite, data, hora, IP, dispositivo, hash e requisitos adicionais escolhidos pelo remetente." },
      { question: "Posso exigir selfie só de uma pessoa?", answer: "Sim. Localização, documento com foto e selfie são configurados individualmente para cada signatário." },
      { question: "O documento assinado pode ser verificado?", answer: "Sim. O PDF final inclui código, hash, QR Code e página de evidências para verificação pública." },
    ], related: ["editar-pdf", "proteger-pdf", "juntar-pdf"],
  },
  "proteger-pdf": {
    slug: "proteger-pdf", appTool: "protect", eyebrow: "Segurança de documentos", title: "Proteger PDF com senha e ocultar dados sensíveis", shortTitle: "Proteger PDF",
    description: "Proteja PDF com senha, controle o acesso e faça redação visual de informações sensíveis antes de compartilhar.",
    intro: "Adicione uma camada de proteção a contratos, laudos, holerites e documentos pessoais. Revise o resultado antes de salvar a cópia protegida.",
    image: toolSecurity, imageAlt: "Documento PDF protegido por escudo e cadeado", icon: LockKeyhole, iconClass: "bg-tool-security",
    formats: "Arquivos PDF sem proteção ou com senha conhecida, conforme a operação escolhida.",
    benefits: ["Proteção por senha", "Remoção com senha autorizada", "Redação de dados sensíveis", "Processamento controlado"],
    steps: ["Escolha proteger, desbloquear ou redigir", "Selecione o PDF", "Informe a senha ou marque os dados", "Revise e baixe a cópia"],
    useCases: ["Contratos confidenciais", "Laudos e documentos pessoais", "Arquivos enviados por e-mail"],
    faq: [
      { question: "Posso remover qualquer senha?", answer: "Não. A remoção exige autorização e a senha correta do documento quando ela for necessária." },
      { question: "A senha fica salva?", answer: "A senha é usada somente para processar a operação solicitada e não deve ser compartilhada com terceiros." },
      { question: "Redigir é o mesmo que pintar de preto?", answer: "A redação deve gerar uma nova cópia sem exposição visual do trecho. Sempre confira o arquivo final antes de compartilhar." },
    ], related: ["assinar-pdf", "editar-pdf", "comprimir-pdf"],
  },
  "pdf-pesquisavel": {
    slug: "pdf-pesquisavel", appTool: "ocr", eyebrow: "OCR em português", title: "Tornar PDF pesquisável com OCR online", shortTitle: "PDF pesquisável",
    description: "Use OCR para reconhecer texto de PDFs digitalizados, pesquisar palavras e extrair o conteúdo de imagens e documentos.",
    intro: "Transforme páginas escaneadas em conteúdo que pode ser localizado, copiado e reaproveitado. O reconhecimento ajuda a pesquisar contratos, notas e arquivos antigos.",
    image: toolOcr, imageAlt: "Documento digitalizado sendo reconhecido por OCR para pesquisa de texto", icon: FileSearch, iconClass: "bg-tool-ocr",
    formats: "PDFs digitalizados e documentos com páginas em imagem, inclusive em português.",
    benefits: ["Reconhecimento de texto em português", "Pesquisa dentro do PDF", "Extração para texto editável", "Útil para arquivos digitalizados"],
    steps: ["Selecione o PDF digitalizado", "Inicie o reconhecimento OCR", "Confira o texto identificado", "Baixe o PDF pesquisável ou o texto"],
    useCases: ["Pesquisar contratos escaneados", "Recuperar arquivos antigos", "Copiar texto de documentos fotografados"],
    faq: [
      { question: "O que é um PDF pesquisável?", answer: "É um PDF que mantém a aparência das páginas e ganha uma camada de texto reconhecida, permitindo localizar palavras." },
      { question: "O OCR reconhece português?", answer: "Sim. O reconhecimento foi preparado para textos em português, incluindo acentos, embora a qualidade dependa da nitidez da digitalização." },
      { question: "Funciona com fotos tortas ou desfocadas?", answer: "Pode funcionar, mas imagens retas, bem iluminadas e nítidas produzem resultados melhores." },
    ], related: ["tratar-documento", "converter-pdf", "comprimir-pdf"],
  },
  "tratar-documento": {
    slug: "tratar-documento",
    appTool: "enhance",
    eyebrow: "Novidade — restauração de digitalizações",
    title: "Tratar documento escaneado e melhorar a nitidez",
    shortTitle: "Tratar documento",
    description: "Limpe manchas, sombras e ruídos de PDFs e imagens escaneadas, melhore a nitidez e preserve textos, imagens e códigos de barras.",
    intro: "Recupere a legibilidade de contratos, boletos, notas e arquivos antigos. O tratamento limpa o fundo e reforça contornos sem recriar, apagar ou mudar o conteúdo original.",
    image: toolEnhance,
    imageAlt: "Comparação antes e depois de documento escaneado tratado, com página limpa e código de barras nítido",
    icon: ScanLine,
    iconClass: "bg-tool-optimize",
    formats: "PDF, JPG, PNG e WEBP, incluindo documentos fotografados ou gerados por scanner.",
    benefits: ["Limpeza de manchas e sujeiras leves", "Mais nitidez em letras e números", "Reforço cuidadoso de códigos de barras", "Modos conservador, equilibrado e intenso"],
    steps: ["Envie um PDF ou uma imagem escaneada", "Escolha o nível de tratamento", "Aguarde a limpeza página por página", "Revise, organize e baixe o novo PDF"],
    useCases: ["Recuperar contratos digitalizados", "Melhorar boletos e códigos de barras", "Limpar fotos de documentos antigos"],
    faq: [
      { question: "O tratamento muda o texto do documento?", answer: "Não. A ferramenta não recria nem reescreve conteúdo; ela trabalha contraste, fundo, ruído e contornos para melhorar a leitura." },
      { question: "A ferramenta apaga manchas escuras?", answer: "Ela reduz sujeiras leves. Marcas escuras que possam ser conteúdo legítimo são preservadas para evitar a perda de informações." },
      { question: "Posso tratar uma foto e baixar em PDF?", answer: "Sim. Envie JPG, PNG ou WEBP, confira a página tratada e baixe o resultado em PDF." },
    ],
    related: ["pdf-pesquisavel", "comprimir-pdf", "converter-pdf"],
  },
};

export const publicToolList = Object.values(publicTools);