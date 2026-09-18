/**
 * Ferramentas de PDF executadas no próprio dispositivo: compressão, senha,
 * PDF/A, redação e conversões entre PDF e formatos do Office.
 */
import { extractPdfEditableLayout, extractPdfText, inspectPdfVisuals, rasterizePages, type PdfEditablePage, type PdfPageVisual } from "@/lib/pdf-preview";

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

type FaithfulPage = { index: number; blob: Blob; width: number; height: number };
export type OfficeConversionMode = "faithful" | "editable";

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function officeFont(value: string) {
  const clean = value.replace(/^[A-Z]{6}\+/, "").replace(/[^\w .-]/g, "").trim();
  return clean || "Arial";
}

async function editableLayout(bytes: Bytes, mode: OfficeConversionMode) {
  return mode === "editable" ? extractPdfEditableLayout(bytes) : [];
}

async function sampleTextBackgrounds(pages: FaithfulPage[], layout: PdfEditablePage[]) {
  for (const [index, source] of layout.entries()) {
    const rendered = pages[index];
    if (!rendered) continue;
    const bitmap = await createImageBitmap(rendered.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      continue;
    }
    context.drawImage(bitmap, 0, 0);
    const sx = bitmap.width / source.width;
    const sy = bitmap.height / source.height;
    for (const text of source.texts) {
      const x = Math.max(0, Math.min(bitmap.width - 1, Math.round(text.x * sx)));
      const y = Math.max(0, Math.min(bitmap.height - 1, Math.round(text.y * sy)));
      const w = Math.max(1, Math.min(bitmap.width - x, Math.round(text.width * sx)));
      const h = Math.max(1, Math.min(bitmap.height - y, Math.round(text.height * sy)));
      const samples = [
        context.getImageData(x, y, 1, 1).data,
        context.getImageData(Math.min(bitmap.width - 1, x + w - 1), y, 1, 1).data,
        context.getImageData(x, Math.min(bitmap.height - 1, y + h - 1), 1, 1).data,
        context.getImageData(Math.min(bitmap.width - 1, x + w - 1), Math.min(bitmap.height - 1, y + h - 1), 1, 1).data,
      ];
      const channel = (position: number) => Math.round(samples.reduce((sum, sample) => sum + (sample[position] ?? 255), 0) / samples.length);
      text.background = [channel(0), channel(1), channel(2)].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    bitmap.close();
  }
}

async function faithfulPdfPages(bytes: Bytes): Promise<FaithfulPage[]> {
  const pages = await rasterizePages(bytes, undefined, "image/jpeg", 2.25);
  const measured: FaithfulPage[] = [];
  for (const page of pages) {
    const bitmap = await createImageBitmap(page.blob);
    measured.push({ index: page.index, blob: page.blob, width: bitmap.width, height: bitmap.height });
    bitmap.close();
  }
  if (!measured.length) throw new Error("Nenhuma página pôde ser convertida");
  return measured;
}

function pageDxa(page: FaithfulPage) {
  const landscape = page.width > page.height;
  const width = landscape ? 15840 : 12240;
  const proportionalHeight = Math.round(width * page.height / page.width);
  const height = Math.min(31680, Math.max(1440, proportionalHeight));
  return { width, height };
}

function wordSection(page: FaithfulPage) {
  const size = pageDxa(page);
  return `<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${size.width}" w:h="${size.height}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
}

/**
 * Modo de fidelidade visual: cada página vira uma imagem integral dentro de um
 * DOCX real. Isso preserva posições, fontes, tabelas e imagens sem reconstrução.
 */
export async function pdfToDocx(bytes: Bytes, mode: OfficeConversionMode = "faithful") {
  const pages = await faithfulPdfPages(bytes);
  const layout = await editableLayout(bytes, mode);
  await sampleTextBackgrounds(pages, layout);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);

  const relationships: string[] = [];
  const paragraphs: string[] = [];
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (!page) continue;
    const relationId = `rId${index + 1}`;
    const size = pageDxa(page);
    const cx = size.width * 635;
    const cy = size.height * 635;
    zip.folder("word/media")?.file(`page-${index + 1}.jpg`, page.blob);
    relationships.push(`<Relationship Id="${relationId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page-${index + 1}.jpg"/>`);
    const editableTexts = (layout[index]?.texts ?? []).map((text, textIndex) => {
      const source = layout[index] as PdfEditablePage;
      const scaleX = size.width / source.width / 20;
      const scaleY = size.height / source.height / 20;
      const left = Math.round(text.x * scaleX * 100) / 100;
      const top = Math.round(text.y * scaleY * 100) / 100;
      const width = Math.max(4, Math.round(text.width * scaleX * 100) / 100);
      const height = Math.max(4, Math.round(text.height * scaleY * 100) / 100);
      const font = xmlEscape(officeFont(text.fontFamily));
      const fontSize = Math.max(2, Math.round(text.fontSize * 2));
      return `<w:r><w:pict><v:shape id="editable-${index + 1}-${textIndex + 1}" type="#_x0000_t202" style="position:absolute;margin-left:${left}pt;margin-top:${top}pt;width:${width}pt;height:${height}pt;z-index:2;mso-wrap-style:none" stroked="f" filled="t" fillcolor="#${text.background}"><v:textbox inset="0,0,0,0"><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:sz w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text.text)}</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict></w:r>`;
    }).join("");
    paragraphs.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index + 1}" name="Página ${index + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${index + 1}" name="Página ${index + 1}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>${editableTexts}</w:p>`);
    if (index < pages.length - 1) paragraphs.push(`<w:p><w:pPr>${wordSection(page)}</w:pPr></w:p>`);
  }
  const finalPage = pages[pages.length - 1];
  if (!finalPage) throw new Error("Nenhuma página pôde ser convertida");
  zip.folder("word/_rels")?.file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`);
  zip.folder("word")?.file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:v="urn:schemas-microsoft-com:vml"><w:body>${paragraphs.join("")}${wordSection(finalPage)}</w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

/** Uma aba por página, com a página integral como imagem e sem grade visível. */
export async function pdfToXlsx(bytes: Bytes, mode: OfficeConversionMode = "faithful") {
  const pages = await faithfulPdfPages(bytes);
  const layout = await editableLayout(bytes, mode);
  await sampleTextBackgrounds(pages, layout);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const overrides = pages.flatMap((_, index) => [
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
  ]).join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  const sheets = pages.map((_, index) => `<sheet name="Página ${index + 1}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const printAreas = pages.map((_, index) => `<definedName name="_xlnm.Print_Area" localSheetId="${index}">'Página ${index + 1}'!$A$1:$A$1</definedName>`).join("");
  const workbookRelationships = pages.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("") + `<Relationship Id="rId${pages.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  zip.folder("xl")?.file("workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets}</sheets><definedNames>${printAreas}</definedNames></workbook>`);
  zip.folder("xl/_rels")?.file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}</Relationships>`);
  zip.folder("xl")?.file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>`);

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (!page) continue;
    const maxWidthInches = page.width > page.height ? 11.02 : 7.48;
    const maxHeightInches = page.width > page.height ? 7.48 : 11.02;
    const imageRatio = page.width / page.height;
    let imageWidthInches = maxWidthInches;
    let imageHeightInches = imageWidthInches / imageRatio;
    if (imageHeightInches > maxHeightInches) {
      imageHeightInches = maxHeightInches;
      imageWidthInches = imageHeightInches * imageRatio;
    }
    const imageWidthEmu = Math.round(imageWidthInches * 914400);
    const imageHeightEmu = Math.round(imageHeightInches * 914400);
    zip.folder("xl/media")?.file(`page-${index + 1}.jpg`, page.blob);
    zip.folder("xl/worksheets")?.file(`sheet${index + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="110" customWidth="1"/></cols><sheetData><row r="1" ht="409" customHeight="1"><c r="A1"/></row></sheetData><printOptions horizontalCentered="1" verticalCentered="1"/><pageMargins left="0" right="0" top="0" bottom="0" header="0" footer="0"/><pageSetup paperSize="9" orientation="${page.width > page.height ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="1"/><drawing r:id="rId1"/></worksheet>`);
    zip.folder("xl/worksheets/_rels")?.file(`sheet${index + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${index + 1}.xml"/></Relationships>`);
    const source = layout[index];
    const shapes = (source?.texts ?? []).map((text, textIndex) => {
      const x = Math.round(text.x / source!.width * imageWidthEmu);
      const y = Math.round(text.y / source!.height * imageHeightEmu);
      const w = Math.max(12000, Math.round(text.width / source!.width * imageWidthEmu));
      const h = Math.max(12000, Math.round(text.height / source!.height * imageHeightEmu));
      const size = Math.max(100, Math.round(text.fontSize * 100));
      return `<xdr:absoluteAnchor><xdr:pos x="${x}" y="${y}"/><xdr:ext cx="${w}" cy="${h}"/><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="${textIndex + 100}" name="Texto editável ${textIndex + 1}"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${text.background}"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr><xdr:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="${size}" typeface="${xmlEscape(officeFont(text.fontFamily))}"/><a:t>${xmlEscape(text.text)}</a:t></a:r></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:absoluteAnchor>`;
    }).join("");
    zip.folder("xl/drawings")?.file(`drawing${index + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${imageWidthEmu}" cy="${imageHeightEmu}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 1}" name="Página ${index + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageWidthEmu}" cy="${imageHeightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>${shapes}</xdr:wsDr>`);
    zip.folder("xl/drawings/_rels")?.file(`drawing${index + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/page-${index + 1}.jpg"/></Relationships>`);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function pdfToPptx(bytes: Bytes, mode: OfficeConversionMode = "faithful") {
  const rasters = await faithfulPdfPages(bytes);
  const layout = await editableLayout(bytes, mode);
  await sampleTextBackgrounds(rasters, layout);
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const first = rasters[0];
  if (!first) throw new Error("Nenhuma página pôde ser convertida");
  const slideWidth = 10;
  const slideHeight = slideWidth * first.height / first.width;
  pptx.defineLayout({ name: "PDF_FIEL", width: slideWidth, height: slideHeight });
  pptx.layout = "PDF_FIEL";
  for (const [index, r] of rasters.entries()) {
    const slide = pptx.addSlide();
    const data = await blobToDataUrl(r.blob);
    slide.background = { color: "FFFFFF" };
    slide.addImage({ data, x: 0, y: 0, w: slideWidth, h: slideHeight, sizing: { type: "contain", w: slideWidth, h: slideHeight } });
    const source = layout[index];
    if (!source) continue;
    for (const text of source.texts) {
      slide.addText(text.text, {
        x: text.x / source.width * slideWidth,
        y: text.y / source.height * slideHeight,
        w: Math.max(0.08, text.width / source.width * slideWidth),
        h: Math.max(0.08, text.height / source.height * slideHeight),
        fontFace: officeFont(text.fontFamily),
        fontSize: Math.max(1, text.fontSize * 72 / 96),
        margin: 0,
        fill: { color: text.background },
        breakLine: false,
        transparency: 0,
      });
    }
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

