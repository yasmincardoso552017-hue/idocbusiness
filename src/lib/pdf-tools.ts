/**
 * Ferramentas de PDF executadas no próprio dispositivo: compressão, senha,
 * PDF/A, redação e conversões entre PDF e formatos do Office.
 */
import { extractPdfText, inspectPdfVisuals, rasterizePages, type PdfPageVisual } from "@/lib/pdf-preview";

export type Bytes = Uint8Array;

async function cantoo() {
  return (await import("@cantoo/pdf-lib")).PDFDocument;
}

async function plain() {
  return (await import("pdf-lib")).PDFDocument;
}

const OFFICE_EXTENSIONS = new Set(["docx", "xlsx", "xls", "csv", "pptx", "html", "htm", "txt"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp"]);

function extension(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function preparePdfBytes(bytes: Uint8Array) {
  if (!bytes.length) throw new Error("O arquivo está vazio");
  const limit = Math.min(bytes.length - 4, 4096);
  for (let index = 0; index <= limit; index++) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46
    ) {
      return index === 0 ? bytes : bytes.slice(index);
    }
  }
  return bytes;
}

function hasVisualRegression(before: PdfPageVisual[], after: PdfPageVisual[]) {
  if (before.length !== after.length) return true;
  return before.some((source, index) => {
    const rebuilt = after[index];
    if (!rebuilt) return true;
    // Páginas realmente vazias permanecem válidas. Só consideramos falha quando
    // havia conteúdo visível e ele praticamente desapareceu após a cópia.
    return source.inkRatio >= 0.00008 && rebuilt.inkRatio < Math.max(0.00004, source.inkRatio * 0.18);
  });
}

async function rebuildPdfFromRenderedPages(bytes: Bytes): Promise<Bytes> {
  const PDFDocument = await plain();
  const rasters = await rasterizePages(bytes, undefined, "image/jpeg", 1.7);
  if (!rasters.length) throw new Error("Nenhuma página pôde ser recuperada");
  const rebuilt = await PDFDocument.create();
  for (const raster of rasters) {
    const jpg = await rebuilt.embedJpg(new Uint8Array(await raster.blob.arrayBuffer()));
    const page = rebuilt.addPage([jpg.width / 1.7, jpg.height / 1.7]);
    page.drawImage(jpg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  return rebuilt.save({ useObjectStreams: false });
}

export type PreparedMergeFile = {
  bytes: Bytes;
  pageCount: number;
  recovered: boolean;
  visuals: PdfPageVisual[];
};

function detectInput(file: File, bytes: Uint8Array) {
  const ext = extension(file.name);
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) || file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    file.type.startsWith("image/") ||
    IMAGE_EXTENSIONS.has(ext) ||
    startsWith(bytes, [0xff, 0xd8, 0xff]) ||
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) ||
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) ||
    (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP")
  ) return "image";
  if (OFFICE_EXTENSIONS.has(ext)) return "office";
  return "unsupported";
}

async function imageFileToPdf(file: File): Promise<Bytes> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`A imagem “${file.name}” está danificada ou usa uma codificação não reconhecida`);
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Não foi possível ler a imagem “${file.name}”`);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Falha ao converter imagem")), "image/jpeg", 0.94),
    );
    const PDFDocument = await plain();
    const pdf = await PDFDocument.create();
    const jpg = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const maxWidth = 595.28;
    const maxHeight = 841.89;
    const scale = Math.min(maxWidth / jpg.width, maxHeight / jpg.height, 1);
    const width = jpg.width * scale;
    const height = jpg.height * scale;
    const page = pdf.addPage([maxWidth, maxHeight]);
    page.drawImage(jpg, { x: (maxWidth - width) / 2, y: (maxHeight - height) / 2, width, height });
    return pdf.save();
  } finally {
    bitmap.close();
  }
}

/** Normaliza PDFs difíceis e, se necessário, reconstrói páginas legíveis como imagem. */
export async function normalizePdf(bytes: Bytes, fileName = "arquivo.pdf"): Promise<Bytes> {
  const PDFDocument = await plain();
  const prepared = preparePdfBytes(bytes);
  try {
    const originalVisuals = await inspectPdfVisuals(prepared, 260);
    const pdf = await PDFDocument.load(prepared.slice(0), { ignoreEncryption: true, updateMetadata: false });
    if (!pdf.getPageCount()) throw new Error("sem páginas");
    const saved = await pdf.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
    const savedVisuals = await inspectPdfVisuals(saved, 260);
    if (hasVisualRegression(originalVisuals, savedVisuals)) return rebuildPdfFromRenderedPages(prepared);
    return saved;
  } catch (initialError) {
    try {
      return await rebuildPdfFromRenderedPages(prepared);
    } catch {
      throw new Error(`O PDF “${fileName}” está protegido por senha, corrompido ou incompleto`);
    }
  }
}

/** Converte uma entrada comum em PDF para uso nas ferramentas de organização. */
export async function fileToPdf(file: File): Promise<Bytes> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectInput(file, bytes);
  if (kind === "pdf") return normalizePdf(bytes, file.name);
  if (kind === "image") return imageFileToPdf(file);
  if (kind === "office") return officeToPdf(file);
  throw new Error(
    `O formato de “${file.name}” não pode ser convertido. Use PDF, JPG, PNG, WEBP, GIF, BMP, DOCX, XLS/XLSX, CSV, PPTX, HTML ou TXT`,
  );
}

/** Prepara e valida visualmente um item antes de adicioná-lo ao PDF unido. */
export async function prepareFileForMerge(file: File): Promise<PreparedMergeFile> {
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectInput(file, sourceBytes);
  if (kind !== "pdf") {
    const converted = await fileToPdf(file);
    const visuals = await inspectPdfVisuals(converted, 260);
    return { bytes: converted, pageCount: visuals.length, recovered: false, visuals };
  }

  const prepared = preparePdfBytes(sourceBytes);
  const sourceVisuals = await inspectPdfVisuals(prepared, 260);
  const PDFDocument = await plain();
  try {
    const source = await PDFDocument.load(prepared.slice(0), { ignoreEncryption: true, updateMetadata: false });
    if (!source.getPageCount()) throw new Error("O PDF não possui páginas");
    const staged = await PDFDocument.create();
    const copied = await staged.copyPages(source, source.getPageIndices());
    copied.forEach((page) => staged.addPage(page));
    const stagedBytes = await staged.save({ useObjectStreams: false });
    const stagedVisuals = await inspectPdfVisuals(stagedBytes, 260);
    if (!hasVisualRegression(sourceVisuals, stagedVisuals)) {
      return { bytes: stagedBytes, pageCount: stagedVisuals.length, recovered: false, visuals: stagedVisuals };
    }
  } catch {
    // A reconstrução visual abaixo é a segunda estratégia para PDFs malformados.
  }

  const rebuilt = await rebuildPdfFromRenderedPages(prepared);
  const recoveredVisuals = await inspectPdfVisuals(rebuilt, 260);
  if (hasVisualRegression(sourceVisuals, recoveredVisuals)) {
    throw new Error(`O PDF “${file.name}” perdeu conteúdo durante a recuperação`);
  }
  return { bytes: rebuilt, pageCount: recoveredVisuals.length, recovered: true, visuals: recoveredVisuals };
}

/** Retorna as páginas que perderam conteúdo visível no PDF unido. */
export async function findMergedVisualRegressions(bytes: Bytes, expected: PdfPageVisual[]) {
  const actual = await inspectPdfVisuals(bytes, 260);
  if (actual.length !== expected.length) {
    return Array.from({ length: Math.max(actual.length, expected.length) }, (_, index) => index);
  }
  return expected.flatMap((source, index) => {
    const merged = actual[index];
    if (!merged) return [index];
    return source.inkRatio >= 0.00008 && merged.inkRatio < Math.max(0.00004, source.inkRatio * 0.18)
      ? [index]
      : [];
  });
}

/** Reconstrução visual de último recurso para um arquivo que perdeu conteúdo ao ser unido. */
export async function rasterizePdfForMerge(bytes: Bytes) {
  const rebuilt = await rebuildPdfFromRenderedPages(bytes);
  const visuals = await inspectPdfVisuals(rebuilt, 260);
  return { bytes: rebuilt, pageCount: visuals.length, recovered: true, visuals } satisfies PreparedMergeFile;
}

/** Reconstrói o PDF a partir das páginas rasterizadas (achata tudo: texto vira imagem). */
export async function flattenToImages(bytes: Bytes, scale = 2, quality = 0.85): Promise<Bytes> {
  const PDFDocument = await plain();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const rasters = await rasterizePages(bytes, src.getPageIndices(), "image/jpeg", scale);
  const out = await PDFDocument.create();
  for (const r of rasters) {
    const blob = quality < 0.9 ? await requantize(r.blob, quality) : r.blob;
    const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const page = out.addPage([jpg.width / scale, jpg.height / scale]);
    page.drawImage(jpg, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  return out.save();
}

async function requantize(blob: Blob, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality),
  );
}

/** Comprime reduzindo resolução e qualidade das páginas. */
export async function compressPdf(bytes: Bytes, level: "leve" | "media" | "forte") {
  const cfg = {
    leve: { scale: 1.6, quality: 0.8 },
    media: { scale: 1.2, quality: 0.65 },
    forte: { scale: 0.9, quality: 0.5 },
  }[level];
  return flattenToImages(bytes, cfg.scale, cfg.quality);
}

export type DocumentTreatmentLevel = "conservador" | "equilibrado" | "intenso";

export type DocumentTreatmentProgress = {
  current: number;
  total: number;
  stage: "preparing" | "cleaning" | "building";
};

const TREATMENT_CONFIG = {
  conservador: { background: 0.28, contrast: 1.08, sharpness: 0.34, whiten: 0.12 },
  equilibrado: { background: 0.48, contrast: 1.16, sharpness: 0.52, whiten: 0.26 },
  intenso: { background: 0.68, contrast: 1.24, sharpness: 0.7, whiten: 0.42 },
} satisfies Record<DocumentTreatmentLevel, { background: number; contrast: number; sharpness: number; whiten: number }>;

function luminance(red: number, green: number, blue: number) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

/**
 * Melhora uma página digitalizada sem reconstruir seu conteúdo. A correção é
 * fotométrica: iluminação, fundo, contraste e nitidez de bordas existentes.
 */
async function treatRaster(blob: Blob, level: DocumentTreatmentLevel) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!context) throw new Error("O navegador não disponibilizou o tratamento de imagem");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);

    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const output = context.createImageData(canvas.width, canvas.height);
    const src = source.data;
    const dst = output.data;
    const cfg = TREATMENT_CONFIG[level];

    // Um mapa de iluminação reduzido permite corrigir sombras de scanner e
    // fotografia sem suavizar letras, linhas, fotografias ou códigos de barras.
    const sample = Math.max(4, Math.ceil(Math.max(canvas.width, canvas.height) / 900));
    const mapWidth = Math.ceil(canvas.width / sample);
    const mapHeight = Math.ceil(canvas.height / sample);
    const map = new Float32Array(mapWidth * mapHeight);
    for (let my = 0; my < mapHeight; my++) {
      const y = Math.min(canvas.height - 1, my * sample + Math.floor(sample / 2));
      for (let mx = 0; mx < mapWidth; mx++) {
        const x = Math.min(canvas.width - 1, mx * sample + Math.floor(sample / 2));
        const offset = (y * canvas.width + x) * 4;
        map[my * mapWidth + mx] = luminance(src[offset] ?? 255, src[offset + 1] ?? 255, src[offset + 2] ?? 255);
      }
    }

    const integralWidth = mapWidth + 1;
    const integral = new Float64Array(integralWidth * (mapHeight + 1));
    for (let y = 0; y < mapHeight; y++) {
      let row = 0;
      for (let x = 0; x < mapWidth; x++) {
        row += map[y * mapWidth + x] ?? 255;
        integral[(y + 1) * integralWidth + x + 1] = (integral[y * integralWidth + x + 1] ?? 0) + row;
      }
    }
    const radius = Math.max(3, Math.round(Math.min(mapWidth, mapHeight) * 0.045));
    const localBackground = (x: number, y: number) => {
      const mx = Math.min(mapWidth - 1, Math.floor(x / sample));
      const my = Math.min(mapHeight - 1, Math.floor(y / sample));
      const left = Math.max(0, mx - radius);
      const top = Math.max(0, my - radius);
      const right = Math.min(mapWidth, mx + radius + 1);
      const bottom = Math.min(mapHeight, my + radius + 1);
      const sum = (integral[bottom * integralWidth + right] ?? 0)
        - (integral[top * integralWidth + right] ?? 0)
        - (integral[bottom * integralWidth + left] ?? 0)
        + (integral[top * integralWidth + left] ?? 0);
      return sum / Math.max(1, (right - left) * (bottom - top));
    };
    const sourceLumaAt = (x: number, y: number) => {
      const safeX = Math.max(0, Math.min(canvas.width - 1, x));
      const safeY = Math.max(0, Math.min(canvas.height - 1, y));
      const offset = (safeY * canvas.width + safeX) * 4;
      return luminance(src[offset] ?? 255, src[offset + 1] ?? 255, src[offset + 2] ?? 255);
    };

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const offset = (y * canvas.width + x) * 4;
        const red = src[offset] ?? 255;
        const green = src[offset + 1] ?? 255;
        const blue = src[offset + 2] ?? 255;
        const lum = luminance(red, green, blue);
        const background = Math.max(96, localBackground(x, y));
        const normalizedLum = Math.min(255, lum + (245 - background) * cfg.background * (0.35 + lum / 390));
        const contrastedLum = Math.max(0, Math.min(255, (normalizedLum - 128) * cfg.contrast + 128));
        const neighborAverage = (
          sourceLumaAt(x - 1, y) + sourceLumaAt(x + 1, y)
          + sourceLumaAt(x, y - 1) + sourceLumaAt(x, y + 1)
        ) / 4;
        const edge = lum - neighborAverage;
        let targetLum = Math.max(0, Math.min(255, contrastedLum + edge * cfg.sharpness));
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
        if (saturation < 24 && targetLum > 175) {
          const cleanStrength = cfg.whiten * ((targetLum - 175) / 80);
          targetLum += (255 - targetLum) * cleanStrength;
        }
        const ratio = lum > 2 ? targetLum / lum : 1;
        // Mantém a cor original. Em fundo neutro, remove apenas a dominante
        // residual que costuma aparecer em papel amarelado ou fotografado.
        const neutralBlend = saturation < 24 && targetLum > 150 ? cfg.whiten * 0.42 : 0;
        dst[offset] = Math.max(0, Math.min(255, red * ratio * (1 - neutralBlend) + targetLum * neutralBlend));
        dst[offset + 1] = Math.max(0, Math.min(255, green * ratio * (1 - neutralBlend) + targetLum * neutralBlend));
        dst[offset + 2] = Math.max(0, Math.min(255, blue * ratio * (1 - neutralBlend) + targetLum * neutralBlend));
        dst[offset + 3] = 255;
      }
    }
    context.putImageData(output, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Falha ao gerar a página tratada")),
        "image/jpeg",
        0.96,
      );
    });
  } finally {
    bitmap.close();
  }
}

/** Trata PDF ou imagem digitalizada e gera uma nova cópia PDF. */
export async function enhanceScannedDocument(
  file: File,
  level: DocumentTreatmentLevel,
  onProgress?: (progress: DocumentTreatmentProgress) => void,
): Promise<Bytes> {
  onProgress?.({ current: 0, total: 0, stage: "preparing" });
  const sourcePdf = await fileToPdf(file);
  const rasters = await rasterizePages(sourcePdf, undefined, "image/jpeg", 2.5);
  if (!rasters.length) throw new Error("Nenhuma página pôde ser preparada para tratamento");
  const PDFDocument = await plain();
  const output = await PDFDocument.create();
  for (let index = 0; index < rasters.length; index++) {
    const raster = rasters[index];
    if (!raster) continue;
    onProgress?.({ current: index + 1, total: rasters.length, stage: "cleaning" });
    const treated = await treatRaster(raster.blob, level);
    const image = await output.embedJpg(new Uint8Array(await treated.arrayBuffer()));
    const page = output.addPage([image.width / 2.5, image.height / 2.5]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    // Entrega o controle entre páginas para manter a tela responsiva em celulares.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  onProgress?.({ current: rasters.length, total: rasters.length, stage: "building" });
  return output.save({ useObjectStreams: false });
}

/** Aplica senha de abertura e senha de permissões. */
export async function protectPdf(bytes: Bytes, userPassword: string, ownerPassword?: string) {
  const PDFDocument = await cantoo();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  pdf.encrypt({ userPassword, ownerPassword: ownerPassword || userPassword });
  return pdf.save();
}

/** Abre com a senha informada e devolve o arquivo sem proteção. */
export async function unlockPdf(bytes: Bytes, password: string) {
  const PDFDocument = await cantoo();
  const pdf = await PDFDocument.load(bytes, { password });
  return pdf.save();
}

/** Converte para PDF/A (arquivamento de longo prazo). */
export async function toPdfA(bytes: Bytes, conformance: "2B" | "3B" = "3B") {
  const PDFDocument = await cantoo();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  await pdf.convertToPDFA({ conformance });
  return pdf.save();
}

/** Campos de formulário preenchíveis do PDF. */
export async function readFormFields(bytes: Bytes) {
  const PDFDocument = await plain();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getForm().getFields().map((f) => {
    const type = f.constructor.name.replace("PDF", "");
    let value = "";
    try {
      const anyField = f as unknown as { getText?: () => string; isChecked?: () => boolean };
      value = anyField.getText?.() ?? (anyField.isChecked?.() ? "true" : "");
    } catch {
      value = "";
    }
    return { name: f.getName(), type, value: value ?? "" };
  });
}

export async function fillFormFields(bytes: Bytes, values: Record<string, string>, flatten: boolean) {
  const PDFDocument = await plain();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFields().find((f) => f.getName() === name);
    if (!field) continue;
    const anyField = field as unknown as {
      setText?: (v: string) => void;
      check?: () => void;
      uncheck?: () => void;
      select?: (v: string) => void;
    };
    try {
      if (anyField.setText) anyField.setText(value);
      else if (anyField.check && (value === "true" || value === "1")) anyField.check();
      else if (anyField.uncheck) anyField.uncheck();
      else anyField.select?.(value);
    } catch {
      /* campo incompatível: ignora */
    }
  }
  if (flatten) form.flatten();
  return pdf.save();
}

/** Texto de cada página, com quebras aproximadas por linha. */
export async function pdfPagesText(bytes: Bytes) {
  return extractPdfText(bytes);
}

export async function pdfToDocx(bytes: Bytes) {
  const pages = await extractPdfText(bytes);
  const body = pages
    .map(
      (t, i) =>
        `<h2>Página ${i + 1}</h2><p>${escapeHtml(t).replace(/\. /g, ".</p><p>")}</p>`,
    )
    .join('<br clear="all" style="page-break-before:always" />');
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${body}</body></html>`;
  return new Blob([html], { type: "application/msword" });
}

export async function pdfToXlsx(bytes: Bytes) {
  const pages = await extractPdfText(bytes);
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  pages.forEach((text, i) => {
    const rows = text
      .split(/(?<=[.;:])\s+/)
      .filter(Boolean)
      .map((line) => line.split(/\s{2,}|\t|;/).map((c) => c.trim()));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows.length ? rows : [["(página sem texto)"]]),
      `Pagina ${i + 1}`.slice(0, 31),
    );
  });
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function pdfToPptx(bytes: Bytes) {
  const rasters = await rasterizePages(
    bytes,
    (await (await plain()).load(bytes, { ignoreEncryption: true })).getPageIndices(),
    "image/jpeg",
    1.5,
  );
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "A4", width: 10, height: 7.5 });
  pptx.layout = "A4";
  for (const r of rasters) {
    const slide = pptx.addSlide();
    const data = await blobToDataUrl(r.blob);
    slide.addImage({ data, x: 0.2, y: 0.2, w: 9.6, h: 7.1, sizing: { type: "contain", w: 9.6, h: 7.1 } });
  }
  const out = (await pptx.write({ outputType: "blob" })) as Blob;
  return out;
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
}

/** Word, Excel, PowerPoint, HTML ou TXT → PDF (mantém o texto, layout simplificado). */
export async function officeToPdf(file: File): Promise<Bytes> {
  const name = file.name.toLowerCase();
  let blocks: string[] = [];
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    blocks = res.value.split(/\n+/);
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    for (const sheet of wb.SheetNames) {
      blocks.push(`# ${sheet}`);
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheet]!, { FS: "   " });
      blocks.push(...csv.split(/\n/));
    }
  } else if (name.endsWith(".pptx")) {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    for (const [i, path] of slides.entries()) {
      const xml = await zip.file(path)!.async("string");
      const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1] ?? "");
      blocks.push(`# Slide ${i + 1}`, ...texts);
    }
  } else if (name.endsWith(".html") || name.endsWith(".htm")) {
    const html = await file.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    blocks = (doc.body.innerText || doc.body.textContent || "").split(/\n+/);
  } else {
    blocks = (await file.text()).split(/\n+/);
  }
  return textToPdf(blocks.filter((b) => b !== undefined));
}

/** Gera um PDF A4 paginado a partir de linhas de texto. */
export async function textToPdf(lines: string[]): Promise<Bytes> {
  const PDFDocument = await plain();
  const { StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  let page = pdf.addPage([595.28, 841.89]);
  let y = page.getHeight() - margin;
  const maxWidth = page.getWidth() - margin * 2;
  const nextPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = page.getHeight() - margin;
  };
  for (const raw of lines) {
    const heading = raw.startsWith("# ");
    const f = heading ? bold : font;
    const size = heading ? 14 : 10.5;
    const text = sanitize(heading ? raw.slice(2) : raw);
    if (!text.trim()) {
      y -= size;
      if (y < margin) nextPage();
      continue;
    }
    let line = "";
    for (const word of text.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        page.drawText(line, { x: margin, y, size, font: f });
        y -= size * 1.45;
        if (y < margin) nextPage();
        line = word;
      } else line = test;
    }
    page.drawText(line, { x: margin, y, size, font: f });
    y -= size * (heading ? 2 : 1.45);
    if (y < margin) nextPage();
  }
  return pdf.save();
}

/** As fontes padrão do PDF não têm todos os caracteres Unicode. */
function sanitize(text: string) {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\xFF]/g, "");
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
