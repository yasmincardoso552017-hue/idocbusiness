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

export type PdfPageVisual = {
  index: number;
  width: number;
  height: number;
  inkRatio: number;
};

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

function canvasInkRatio(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return 0;
  const step = Math.max(1, Math.floor(Math.max(canvas.width, canvas.height) / 320));
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let sampled = 0;
  let ink = 0;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const offset = (y * canvas.width + x) * 4;
      const red = pixels[offset] ?? 255;
      const green = pixels[offset + 1] ?? 255;
      const blue = pixels[offset + 2] ?? 255;
      sampled += 1;
      if (red < 248 || green < 248 || blue < 248) ink += 1;
    }
  }
  return sampled ? ink / sampled : 0;
}

function createPageCanvas(viewport: { width: number; height: number }) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) throw new Error("O navegador não disponibilizou a área de desenho");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
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
  const attempts = [
    { intent: "display", annotationMode: 2 },
    { intent: "print", annotationMode: 2 },
    { intent: "display" },
  ] as const;
  let best: HTMLCanvasElement | null = null;
  let bestInk = -1;
  let lastError: unknown;
  for (const options of attempts) {
    const { canvas, context } = createPageCanvas(viewport);
    try {
      await page.render({ canvas, canvasContext: context, viewport, ...options } as never).promise;
      const ink = canvasInkRatio(canvas);
      if (ink > bestInk) {
        best = canvas;
        bestInk = ink;
      }
      // Uma página com conteúdo visível já está pronta; tentativas extras só são
      // necessárias para formulários/anotações que alguns PDFs desenham em branco.
      if (ink >= 0.00008) return canvas;
    } catch (error) {
      lastError = error;
    }
  }
  if (best) return best;
  throw lastError instanceof Error ? lastError : new Error("Não foi possível desenhar a página");
}

/** Mede visualmente cada página; usado para detectar regressões brancas após uma reconstrução. */
export async function inspectPdfVisuals(bytes: Uint8Array, targetWidth = 260): Promise<PdfPageVisual[]> {
  const doc = await openPdf(bytes);
  const visuals: PdfPageVisual[] = [];
  if (!doc.numPages) throw new PdfPreviewError("empty", "Este PDF não possui páginas visíveis.");
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      try {
        const canvas = await renderPageWithFallback(page, targetWidth);
        visuals.push({
          index: i - 1,
          width: canvas.width,
          height: canvas.height,
          inkRatio: canvasInkRatio(canvas),
        });
      } finally {
        page.cleanup();
      }
    }
  } finally {
    doc.cleanup();
  }
  return visuals;
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
  try {
    for (const p of selectedPages) {
      const page = await doc.getPage(p + 1);
      try {
        const base = page.getViewport({ scale: 1 });
        const canvas = await renderPageWithFallback(page, Math.max(120, base.width * scale));
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Falha ao gerar a imagem da página")), mime, 0.92),
        );
        out.push({ index: p, blob });
      } finally {
        page.cleanup();
      }
    }
  } finally {
    doc.cleanup();
  }
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

export type PdfEditableText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  background: string;
  color: string;
  rotation: number;
};

export type PdfEditablePage = {
  width: number;
  height: number;
  background: string;
  texts: PdfEditableText[];
  images: PdfEditableImage[];
};

export type PdfEditableImage = {
  x: number;
  y: number;
  width: number;
  height: number;
  blob: Blob;
};

type Matrix = [number, number, number, number, number, number];

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function matrixPoint(matrix: Matrix, x: number, y: number) {
  return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}

async function imageObjectToBlob(image: { width?: number; height?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: ImageBitmap }) {
  const width = image.width ?? image.bitmap?.width ?? 0;
  const height = image.height ?? image.bitmap?.height ?? 0;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (image.bitmap) {
    context.drawImage(image.bitmap, 0, 0);
  } else if (image.data) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    const channels = image.data.length / (width * height);
    for (let pixel = 0; pixel < width * height; pixel++) {
      const source = pixel * channels;
      const target = pixel * 4;
      if (channels >= 3) {
        rgba[target] = image.data[source] ?? 0;
        rgba[target + 1] = image.data[source + 1] ?? 0;
        rgba[target + 2] = image.data[source + 2] ?? 0;
        rgba[target + 3] = channels >= 4 ? (image.data[source + 3] ?? 255) : 255;
      } else {
        const value = image.data[source] ?? 0;
        rgba[target] = value;
        rgba[target + 1] = value;
        rgba[target + 2] = value;
        rgba[target + 3] = 255;
      }
    }
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  } else {
    return null;
  }
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function resolvePageObject(page: { objs: { get: (id: string, callback?: (value: unknown) => void) => unknown } }, id: string) {
  try {
    const immediate = page.objs.get(id);
    if (immediate) return immediate;
  } catch {
    // O objeto ainda pode estar sendo decodificado; aguarda o callback do PDF.js.
  }
  return await new Promise<unknown>((resolve) => page.objs.get(id, resolve));
}

async function extractPageImages(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof openPdf>>["getPage"]>>,
  pageHeight: number,
) {
  const lib = await getLib();
  const operators = await page.getOperatorList();
  const images: PdfEditableImage[] = [];
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  for (let index = 0; index < operators.fnArray.length; index++) {
    const operation = operators.fnArray[index];
    const args = operators.argsArray[index] as unknown[] | undefined;
    if (operation === lib.OPS.save) stack.push([...matrix]);
    else if (operation === lib.OPS.restore) matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (operation === lib.OPS.transform && args?.length === 6) matrix = multiplyMatrix(matrix, args.map(Number) as Matrix);
    else if (operation === lib.OPS.paintImageXObject || operation === lib.OPS.paintInlineImageXObject) {
      const raw = operation === lib.OPS.paintImageXObject && typeof args?.[0] === "string"
        ? await resolvePageObject(page as never, args[0])
        : args?.[0];
      const image = raw as { width?: number; height?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: ImageBitmap } | undefined;
      if (!image) continue;
      const blob = await imageObjectToBlob(image);
      if (!blob) continue;
      const corners = [matrixPoint(matrix, 0, 0), matrixPoint(matrix, 1, 0), matrixPoint(matrix, 0, 1), matrixPoint(matrix, 1, 1)];
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      images.push({ x: minX, y: pageHeight - maxY, width: maxX - minX, height: maxY - minY, blob });
    }
  }
  return images;
}

/** Extrai texto com posição e fonte declarada para reconstrução editável no Office. */
export async function extractPdfEditableLayout(bytes: Uint8Array): Promise<PdfEditablePage[]> {
  const doc = await openPdf(bytes);
  const pages: PdfEditablePage[] = [];
  try {
    for (let index = 1; index <= doc.numPages; index++) {
      const page = await doc.getPage(index);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const styles = content.styles as Record<string, { fontFamily?: string }>;
        const texts: PdfEditableText[] = [];
        for (const raw of content.items) {
          if (!("str" in raw) || !raw.str.trim()) continue;
          const item = raw as typeof raw & { transform: number[]; width: number; height: number; fontName: string };
          const fontSize = Math.max(1, Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0) || item.height);
          const height = Math.max(fontSize, item.height || fontSize);
          const rotation = Math.atan2(item.transform[1] ?? 0, item.transform[0] ?? 1) * 180 / Math.PI;
          texts.push({
            text: item.str,
            x: Math.max(0, item.transform[4] ?? 0),
            y: Math.max(0, viewport.height - (item.transform[5] ?? 0) - height),
            width: Math.max(item.width || fontSize, 1),
            height,
            fontSize,
            fontFamily: styles[item.fontName]?.fontFamily?.split(",")[0]?.replace(/["']/g, "").trim() || "Arial",
            background: "FFFFFF",
            color: "000000",
            rotation: Number.isFinite(rotation) ? rotation : 0,
          });
        }
        const images = await extractPageImages(page, viewport.height);
        pages.push({ width: viewport.width, height: viewport.height, background: "FFFFFF", texts, images });
      } finally {
        page.cleanup();
      }
    }
  } finally {
    doc.cleanup();
  }
  return pages;
}
