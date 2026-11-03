import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('screenshot tool', () => {
  const code = readFileSync(join(root, 'public/tools/screenshot.js'), 'utf8');

  it('does not load html2canvas from cdnjs', () => {
    expect(code).not.toMatch(/cdnjs\.cloudflare\.com/i);
    expect(code).not.toMatch(/cdn\.jsdelivr\.net/i);
  });

  it('loads vendored html2canvas and offers full page + scroll + region', () => {
    expect(code).toContain('vendor/html2canvas.min.js');
    expect(code).toContain('Страница уже вся загружена');
    expect(code).toContain('подгружается при прокрутке');
    expect(code).toContain('Выделить область');
    expect(code).toContain('ignoreElements');
    expect(code).toContain('[data-cards]');
    expect(code).toContain('Esc — стоп');
    expect(code).toMatch(/setStatus|Снимаю|Не удалось|пустой/i);
  });

  it('ships vendor file on disk', () => {
    const size = readFileSync(join(root, 'public/vendor/html2canvas.min.js')).byteLength;
    expect(size).toBeGreaterThan(10_000);
  });
});
