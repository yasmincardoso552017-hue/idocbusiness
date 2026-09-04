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

async function canvasToUrl(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return await new Promise<string>((resolve) =>
    canvas.toBlob((b) => resolve(URL.createObjectURL(b!)), type, quality),
  );
}

/** Renders every page of a PDF to object URLs for preview. */
export async function renderPdfPages(
  bytes: Uint8Array,
  targetWidth = 260,
  onPage?: (page: RenderedPage, total: number) => void,
): Promise<RenderedPage[]> {
  const lib = await getLib();
  const doc = await lib.getDocument({ data: bytes.slice(0) }).promise;
  const out: RenderedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidth / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    const rendered: RenderedPage = {
      index: i - 1,
      width: canvas.width,
      height: canvas.height,
      url: await canvasToUrl(canvas, "image/jpeg", 0.85),
    };
    out.push(rendered);
    onPage?.(rendered, doc.numPages);
  }

  doc.cleanup();
  return out;
}

/** Renders selected pages as image blobs in the requested raster format. */
export async function rasterizePages(
  bytes: Uint8Array,
  pages: number[],
  mime: string,
  scale = 2,
): Promise<{ index: number; blob: Blob }[]> {
  const lib = await getLib();
  const doc = await lib.getDocument({ data: bytes.slice(0) }).promise;
  const out: { index: number; blob: Blob }[] = [];
  for (const p of pages) {
    const page = await doc.getPage(p + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), mime, 0.92),
    );
    out.push({ index: p, blob });
  }
  doc.cleanup();
  return out;
}

/** Extrai o texto de cada página do PDF (camada de texto existente). */
export async function extractPdfText(bytes: Uint8Array): Promise<string[]> {
  const lib = await getLib();
  const doc = await lib.getDocument({ data: bytes.slice(0) }).promise;
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
