// Build "legacy": compatível com Safari/iOS e navegadores mais antigos.
let libPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

async function getLib() {
  if (!libPromise) {
    libPromise = (async () => {
      const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })();
  }
  return libPromise;
}


export type RenderedPage = { index: number; width: number; height: number; url: string };

export type RenderPdfProgress = {
  page: RenderedPage;
  total: number;
  completed: number;
};

export class PdfPreviewError extends Error {
  code: "password" | "invalid" | "empty" | "unsupported";

  constructor(code: PdfPreviewError["code"], message: string) {
    super(message);
    this.name = "PdfPreviewError";
    this.code = code;
  }
}

async function canvasToUrl(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return await new Promise<string>((resolve, reject) =>
    canvas.toBlob(
      (blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("Falha ao criar a imagem da página")),
      type,
      quality,
    ),
  );
}

function friendlyPdfError(error: unknown): PdfPreviewError {
  const source = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/password|senha/i.test(source)) {
    return new PdfPreviewError("password", "Este PDF possui senha. Use Remover senha antes de visualizá-lo.");
  }
  if (/invalid|corrupt|trailer|xref|format|header|unexpected response/i.test(source)) {
    return new PdfPreviewError("invalid", "O PDF está incompleto ou danificado e não pôde ser recuperado.");
  }
  return new PdfPreviewError("unsupported", "Este PDF usa recursos que o navegador não conseguiu interpretar.");
}

async function openPdf(bytes: Uint8Array) {
  const lib = await getLib();
  const attempts = [
    { stopAtErrors: false, useSystemFonts: true, enableXfa: true },
    { stopAtErrors: false, useSystemFonts: true, enableXfa: false, isEvalSupported: false },
  ];
  let lastError: unknown;
  for (const options of attempts) {
    try {
      return await lib.getDocument({
        data: bytes.slice(0),
        verbosity: lib.VerbosityLevel.ERRORS,
        ...options,
      }).promise;
    } catch (error) {
      lastError = error;
      if (/password/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error))) break;
    }
  }
  throw friendlyPdfError(lastError);
}

async function renderPageWithFallback(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof openPdf>>["getPage"]>>,
  targetWidth: number,
) {
  const base = page.getViewport({ scale: 1 });
  if (!Number.isFinite(base.width) || !Number.isFinite(base.height) || base.width <= 0 || base.height <= 0) {
    throw new Error("Dimensões de página inválidas");
  }
  const safeTarget = Math.max(120, Math.min(targetWidth, 1600));
  const requestedScale = safeTarget / base.width;
  const maxPixels = 16_000_000;
  const pixelScale = Math.sqrt(maxPixels / (base.width * base.height));
  const scale = Math.max(0.05, Math.min(requestedScale, pixelScale));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("O navegador não disponibilizou a área de desenho");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  try {
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      intent: "display",
      annotationMode: 0,
    } as never).promise;
  } catch {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport, intent: "display" } as never).promise;
  }
  return canvas;
}

/** Renders every page of a PDF to object URLs for preview. */
export async function renderPdfPages(
  bytes: Uint8Array,
  targetWidth = 260,
  onPage?: (page: RenderedPage, total: number) => void,
): Promise<RenderedPage[]> {
  const doc = await openPdf(bytes);
  const out: RenderedPage[] = [];
  if (!doc.numPages) throw new PdfPreviewError("empty", "Este PDF não possui páginas visíveis.");

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const canvas = await renderPageWithFallback(page, targetWidth);
        const rendered: RenderedPage = {
          index: i - 1,
          width: canvas.width,
          height: canvas.height,
          url: await canvasToUrl(canvas, "image/jpeg", 0.88),
        };
        out.push(rendered);
        onPage?.(rendered, doc.numPages);
        page.cleanup();
      } catch (error) {
        if (!out.length) throw error;
      }
    }
  } finally {
    doc.cleanup();
  }
  if (!out.length) throw new PdfPreviewError("invalid", "Nenhuma página deste PDF pôde ser exibida.");
  return out;
}

/** Renders selected pages as image blobs in the requested raster format. */
export async function rasterizePages(
  bytes: Uint8Array,
  pages: number[] | undefined,
  mime: string,
  scale = 2,
): Promise<{ index: number; blob: Blob }[]> {
  const doc = await openPdf(bytes);
  const out: { index: number; blob: Blob }[] = [];
  const selectedPages = pages ?? Array.from({ length: doc.numPages }, (_, index) => index);
  for (const p of selectedPages) {
    const page = await doc.getPage(p + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("O navegador não disponibilizou a área de desenho");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Falha ao gerar a imagem da página")), mime, 0.92),
    );
    out.push({ index: p, blob });
  }
  doc.cleanup();
  return out;
}

/** Extrai o texto de cada página do PDF (camada de texto existente). */
export async function extractPdfText(bytes: Uint8Array): Promise<string[]> {
  const doc = await openPdf(bytes);
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  doc.cleanup();
  return pages;
}
