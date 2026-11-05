export type PdfGlyph = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PdfRegion = { x1: number; y1: number; x2: number; y2: number };

function usable(items: PdfGlyph[]): PdfGlyph[] {
  return items.filter((item) => String(item.text || '').trim());
}

/** Keep glyphs whose center sits inside the box. Null region means the whole page. */
export function filterGlyphs(items: PdfGlyph[], region: PdfRegion | null): PdfGlyph[] {
  const list = usable(items);
  if (!region) return list;
  const x1 = Math.min(region.x1, region.x2);
  const x2 = Math.max(region.x1, region.x2);
  const y1 = Math.min(region.y1, region.y2);
  const y2 = Math.max(region.y1, region.y2);
  return list.filter((item) => {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
  });
}

function lineTolerance(items: PdfGlyph[]): number {
  const heights = items.map((item) => item.h || 8).sort((a, b) => a - b);
  return Math.max(2, heights[Math.floor(heights.length / 2)]! * 0.6);
}

/** Gap that means a word space. Letter kerning stays below this. */
function wordGap(parts: PdfGlyph[]): number {
  const heights = parts.map((item) => item.h || 8).sort((a, b) => a - b);
  const height = heights[Math.floor(heights.length / 2)] || 8;
  return Math.max(1.2, height * 0.22);
}

function joinParts(parts: PdfGlyph[], spaceGap: number): string {
  let out = '';
  let lastRight = -1;
  for (const part of parts) {
    const gap = lastRight < 0 ? 0 : part.x - lastRight;
    if (out && gap > spaceGap) out += ' ';
    out += part.text;
    lastRight = part.x + Math.max(part.w, 0);
  }
  return out.replace(/[ \t]+/g, ' ').trim();
}

function linesOf(items: PdfGlyph[]): PdfGlyph[][] {
  const tol = lineTolerance(items);
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; parts: PdfGlyph[] }[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= tol) last.parts.push(item);
    else lines.push({ y: item.y, parts: [item] });
  }
  return lines.map((line) => line.parts.sort((a, b) => a.x - b.x));
}

/** Reading order: top to bottom, left to right. */
export function glyphsToPlainText(items: PdfGlyph[]): string {
  const list = usable(items);
  if (!list.length) return '';
  return linesOf(list)
    .map((parts) => joinParts(parts, wordGap(parts)))
    .filter(Boolean)
    .join('\n');
}

/** Place glyphs into a grid by rows and horizontal gaps. */
export function glyphsToGrid(items: PdfGlyph[]): string[][] {
  const list = usable(items);
  if (!list.length) return [];
  const lines = linesOf(list);
  const rows = lines.map((parts) => {
    const cells: string[] = [];
    let bucket: PdfGlyph[] = [];
    let lastRight = -1;
    const cellGap = Math.max(12, lineTolerance(parts) * 3);
    const flush = () => {
      const text = joinParts(bucket, wordGap(bucket.length ? bucket : parts));
      if (text) cells.push(text);
      bucket = [];
    };
    for (const part of parts) {
      if (lastRight >= 0 && part.x - lastRight > cellGap) flush();
      bucket.push(part);
      lastRight = part.x + Math.max(part.w, 0);
    }
    flush();
    return cells;
  });
  const width = Math.max(0, ...rows.map((row) => row.length));
  return rows.map((row) => {
    const next = [...row];
    while (next.length < width) next.push('');
    return next;
  });
}
