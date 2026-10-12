/** Strict, bounded parser: malformed/out-of-document ranges cannot silently export the wrong pages. */
export function parsePageRange(spec: string, total: number): number[] {
  if (!Number.isInteger(total) || total < 1 || !spec.trim()) throw new Error("Informe páginas válidas, ex.: 1-3,7");
  const indexes = new Set<number>();
  for (const part of spec.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Intervalo inválido. Use páginas e intervalos, ex.: 1-3,7");
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > total) throw new Error(`Escolha páginas entre 1 e ${total}`);
    for (let page = start; page <= end; page++) indexes.add(page - 1);
  }
  return [...indexes].sort((a, b) => a - b);
}

export function canExportPreview(loading: boolean, error: string | null, loaded: number, total: number) {
  return !loading && !error && loaded > 0 && loaded === total;
}