import { glyphsToPlainText, type PdfGlyph } from './pdfText';

function usable(items: PdfGlyph[]): PdfGlyph[] {
  return items.filter((item) => String(item.text || '').trim());
}

function compact(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

function sameText(a: string, b: string): boolean {
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long = left.length <= right.length ? right : left;
  if (short.length < 2) return false;
  return long.includes(short) && short.length / long.length >= 0.75;
}

function near(word: PdfGlyph, item: PdfGlyph): boolean {
  const dy = Math.abs(word.y + word.h / 2 - (item.y + item.h / 2));
  const dx = Math.abs(word.x + word.w / 2 - (item.x + item.w / 2));
  return dy <= Math.max(word.h, item.h, 8) * 0.8 && dx <= Math.max(word.w, item.w, 8);
}

/** How much of `word` sits on top of `other`. */
function overlapRatio(word: PdfGlyph, other: PdfGlyph): number {
  const width = Math.min(word.x + word.w, other.x + other.w) - Math.max(word.x, other.x);
  const height = Math.min(word.y + word.h, other.y + other.h) - Math.max(word.y, other.y);
  if (width <= 0 || height <= 0) return 0;
  return (width * height) / Math.max(word.w * Math.max(word.h, 1), 1);
}

/**
 * Keep letters already stored in the PDF. Add picture words only where the file
 * has no matching letters, so a number beside a name stays beside it.
 */
export function reconcileGlyphs(fileGlyphs: PdfGlyph[], imageGlyphs: PdfGlyph[]): PdfGlyph[] {
  const file = usable(fileGlyphs).map((item) => ({ ...item }));
  const image = usable(imageGlyphs);
  const dropFile = new Set<number>();
  const extra: PdfGlyph[] = [];
  for (const word of image) {
    const hits = file
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => overlapRatio(word, item) >= 0.15 || near(word, item));
    if (!hits.length) {
      extra.push(word);
      continue;
    }
    const fileText = hits.map((hit) => compact(hit.item.text)).join('');
    const imageText = compact(word.text);
    const covered = Math.max(...hits.map((hit) => overlapRatio(word, hit.item)));
    if (
      imageText === fileText
      || (fileText.includes(imageText) && imageText.length / Math.max(fileText.length, 1) >= 0.75)
    ) {
      continue;
    }
    if (fileText && imageText.includes(fileText) && imageText.length > fileText.length) {
      hits.forEach((hit) => dropFile.add(hit.index));
      extra.push(word);
      continue;
    }
    const fileMuchWider = hits.some((hit) => hit.item.w > word.w * 1.8);
    if (sameText(word.text, fileText) || (covered >= 0.55 && !fileMuchWider)) continue;
    if (fileMuchWider) {
      hits.forEach((hit) => {
        if (word.x > hit.item.x) hit.item.w = Math.max(4, word.x - hit.item.x - 24);
      });
    }
    extra.push(word);
  }
  // #region agent log
  fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'118115'},body:JSON.stringify({sessionId:'118115',runId:'pre-fix',hypothesisId:'H1',location:'pdfReconcile.ts:reconcileGlyphs',message:'reconcile counts',data:{fileCount:file.length,imageCount:image.length,extraCount:extra.length,dropped:image.length-extra.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return [...file.filter((_, index) => !dropFile.has(index)), ...extra];
}

export type SideLine = { file: string; image: string };

/** One visual line: letters from the file on the left, letters from the picture on the right. */
export function alignLines(fileGlyphs: PdfGlyph[], imageGlyphs: PdfGlyph[]): SideLine[] {
  const tagged = [
    ...usable(fileGlyphs).map((item) => ({ ...item, source: 'file' as const })),
    ...usable(imageGlyphs).map((item) => ({ ...item, source: 'image' as const })),
  ];
  if (!tagged.length) return [];
  const heights = tagged.map((item) => item.h || 8).sort((a, b) => a - b);
  const tolerance = Math.max(2, heights[Math.floor(heights.length / 2)]! * 0.6);
  const sorted = [...tagged].sort((a, b) => b.y - a.y || a.x - b.x);
  const bands: { y: number; items: typeof tagged }[] = [];
  for (const item of sorted) {
    const last = bands[bands.length - 1];
    if (last && Math.abs(last.y - item.y) <= tolerance) last.items.push(item);
    else bands.push({ y: item.y, items: [item] });
  }
  return bands
    .map((band) => ({
      file: glyphsToPlainText(band.items.filter((item) => item.source === 'file')),
      image: glyphsToPlainText(band.items.filter((item) => item.source === 'image')),
    }))
    .filter((line) => line.file || line.image);
}
