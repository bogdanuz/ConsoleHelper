import { describe, expect, it } from 'vitest';
import { filterGlyphs, glyphsToGrid, glyphsToPlainText } from '../../src/core/pdfText';

const page = [
  { text: 'Budget', x: 10, y: 100, w: 40, h: 10 },
  { text: '100', x: 80, y: 100, w: 20, h: 10 },
  { text: 'Note', x: 10, y: 70, w: 30, h: 10 },
  { text: 'Side', x: 200, y: 40, w: 30, h: 10 },
];

describe('pdf text layout', () => {
  it('keeps only glyphs inside the selected box', () => {
    const picked = filterGlyphs(page, { x1: 0, y1: 60, x2: 120, y2: 120 });
    expect(picked.map((item) => item.text)).toEqual(['Budget', '100', 'Note']);
  });

  it('reads top to bottom', () => {
    expect(glyphsToPlainText(page.filter((item) => item.x < 150))).toBe('Budget 100\nNote');
  });

  it('splits a wide gap into columns', () => {
    expect(glyphsToGrid(page.filter((item) => item.y > 90))).toEqual([['Budget', '100']]);
  });

  it('keeps a normal word space and still glues tight letters', () => {
    const words = [
      { text: 'Hello', x: 10, y: 40, w: 25, h: 10 },
      { text: 'world', x: 38, y: 40, w: 25, h: 10 },
    ];
    expect(glyphsToPlainText(words)).toBe('Hello world');
    expect(glyphsToGrid(words)).toEqual([['Hello world']]);
  });

  it('joins adjacent letters without inserting spaces', () => {
    const letters = ['B', 'u', 'd'].map((text, i) => ({ text, x: 10 + i * 6, y: 40, w: 6, h: 10 }));
    expect(glyphsToPlainText(letters)).toBe('Bud');
    expect(glyphsToGrid(letters)).toEqual([['Bud']]);
  });

  it('accepts a box drawn from the opposite corner', () => {
    const picked = filterGlyphs(page, { x1: 120, y1: 120, x2: 0, y2: 90 });
    expect(picked.map((item) => item.text)).toEqual(['Budget', '100']);
  });

  it('returns empty text when the page has no letters', () => {
    expect(glyphsToPlainText([{ text: '   ', x: 0, y: 0, w: 1, h: 1 }])).toBe('');
    expect(glyphsToGrid([])).toEqual([]);
  });
});
