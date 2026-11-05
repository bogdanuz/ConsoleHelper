/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { filterGlyphs, glyphsToGrid, glyphsToPlainText } from '../../src/core/pdfText';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('pdf tool', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { __pdf?: { destroy: () => void } }).__pdf;
  });

  it('uses the same text layout as core and stays a separate tool', () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    expect(code).toContain('Выбрать PDF');
    expect(code).toContain('Текст области');
    expect(code).toContain('Таблица страницы');
    expect(code).not.toContain('text-to-table.js');
    (0, eval)(code);
    const api = (window as unknown as { __pdf: { _test: { filterGlyphs: typeof filterGlyphs; glyphsToPlainText: typeof glyphsToPlainText; glyphsToGrid: typeof glyphsToGrid }; destroy: () => void } }).__pdf;
    const items = [
      { text: 'A', x: 0, y: 20, w: 10, h: 8 },
      { text: 'B', x: 40, y: 20, w: 10, h: 8 },
    ];
    expect(api._test.glyphsToPlainText(items)).toBe(glyphsToPlainText(items));
    expect(api._test.glyphsToGrid(items)).toEqual(glyphsToGrid(items));
    expect(api._test.filterGlyphs(items, { x1: 0, y1: 0, x2: 20, y2: 30 }).map((item) => item.text)).toEqual(
      filterGlyphs(items, { x1: 0, y1: 0, x2: 20, y2: 30 }).map((item) => item.text),
    );
    api.destroy();
  });

  it('asks to draw an area before taking a region', () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    const click = (label: string) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label)?.click();
    const statusText = () =>
      [...document.querySelectorAll('div')].map((node) => node.textContent || '').find((text) => text.startsWith('Сначала'));
    click('Текст области');
    expect(statusText()).toContain('обведи область');
    click('Таблица области');
    expect(statusText()).toContain('обведи область');
    click('Текст страницы');
    expect(statusText()).toContain('выбери PDF');
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });
});
