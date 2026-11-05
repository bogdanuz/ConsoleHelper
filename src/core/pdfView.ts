import { normalizeRows } from './normalizeRows';
import { glyphsToGrid, type PdfGlyph } from './pdfText';

/** Rows in reading order, then the same tidy-up used for crooked on-screen tables. */
export function smartTableRows(glyphs: PdfGlyph[]): string[][] {
  return normalizeRows(glyphsToGrid(glyphs)).rows;
}

/** The picture line kept more letters than the separate words, so use the whole line. */
export function lineKeepsMoreLetters(lineText: string, wordTexts: string[]): boolean {
  const line = lineText.replace(/\s/g, '');
  const words = wordTexts.join('').replace(/\s/g, '');
  return line.length > words.length + 1;
}
