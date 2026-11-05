import { describe, expect, it } from 'vitest';
import { lineKeepsMoreLetters, smartTableRows } from '../../src/core/pdfView';

describe('pdf view', () => {
  it('joins a title and the code written on the next line', () => {
    const glyphs = [
      { text: 'Budget', x: 10, y: 100, w: 50, h: 12 },
      { text: '100', x: 90, y: 100, w: 30, h: 12 },
      { text: 'ID-12', x: 10, y: 80, w: 40, h: 12 },
    ];
    expect(smartTableRows(glyphs)).toEqual([['Budget', 'ID-12', '100']]);
  });

  it('keeps a full picture line when separate words dropped letters', () => {
    expect(lineKeepsMoreLetters('Бюджет 100', ['Бюд', '100'])).toBe(true);
    expect(lineKeepsMoreLetters('Бюджет 100', ['Бюджет', '100'])).toBe(false);
  });
});
