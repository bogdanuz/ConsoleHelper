import { describe, expect, it } from 'vitest';
import { glyphsToGrid, glyphsToPlainText } from '../../src/core/pdfText';
import { alignLines, reconcileGlyphs } from '../../src/core/pdfReconcile';

const fileWord = { text: 'Budget', x: 10, y: 100, w: 40, h: 10 };
const imageWord = { text: 'Budget', x: 11, y: 100, w: 40, h: 10 };
const imageNumber = { text: '100', x: 80, y: 100, w: 20, h: 10 };

describe('pdf reconcile', () => {
  it('keeps file letters and places a picture number beside them', () => {
    const merged = reconcileGlyphs([fileWord], [imageWord, imageNumber]);
    expect(glyphsToPlainText(merged)).toBe('Budget 100');
    expect(glyphsToGrid(merged)).toEqual([['Budget', '100']]);
  });

  it('uses the picture when the file has no letters', () => {
    expect(glyphsToPlainText(reconcileGlyphs([], [imageWord, imageNumber]))).toBe('Budget 100');
  });

  it('shows the file and the picture on the same line', () => {
    expect(alignLines([fileWord], [imageWord, imageNumber])).toEqual([
      { file: 'Budget', image: 'Budget 100' },
    ]);
  });

  it('does not repeat a word when the picture box is only shifted', () => {
    const shifted = { text: 'Budget', x: 46, y: 100, w: 40, h: 10 };
    expect(glyphsToPlainText(reconcileGlyphs([fileWord], [shifted]))).toBe('Budget');
  });

  it('keeps the fuller picture word when the file only has a short piece', () => {
    const fragment = { text: 'B', x: 10, y: 100, w: 8, h: 10 };
    const full = { text: 'Budget', x: 10, y: 100, w: 40, h: 10 };
    expect(glyphsToPlainText(reconcileGlyphs([fragment], [full]))).toBe('Budget');
  });

  it('keeps a picture number that sits inside a wide file box', () => {
    const wide = { text: 'Name', x: 10, y: 100, w: 100, h: 10 };
    const number = { text: '100', x: 80, y: 100, w: 20, h: 10 };
    expect(glyphsToPlainText(reconcileGlyphs([wide], [number]))).toBe('Name 100');
    expect(glyphsToGrid(reconcileGlyphs([wide], [number]))).toEqual([['Name', '100']]);
  });

  it('returns nothing when both sources are empty', () => {
    expect(reconcileGlyphs([], [])).toEqual([]);
    expect(alignLines([{ text: '  ', x: 0, y: 0, w: 1, h: 1 }], [])).toEqual([]);
  });
});
