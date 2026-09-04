/**
 * Ferramentas de PDF executadas no próprio dispositivo: compressão, senha,
 * PDF/A, redação e conversões entre PDF e formatos do Office.
 */
import { extractPdfText, rasterizePages } from "@/lib/pdf-preview";

export type Bytes = Uint8Array;

async function cantoo() {
  return (await import("@cantoo/pdf-lib")).PDFDocument;
}

async function plain() {
  return (await import("pdf-lib")).PDFDocument;
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
