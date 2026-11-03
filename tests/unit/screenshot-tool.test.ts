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

  it('loads vendored html2canvas and offers viewport + region', () => {
    expect(code).toContain('vendor/html2canvas.min.js');
    expect(code).toContain('Видимая область');
    expect(code).toContain('Выделить область');
    expect(code).toMatch(/setStatus|Готовлю|Не удалось/);
  });

  it('ships vendor file on disk', () => {
    const size = readFileSync(join(root, 'public/vendor/html2canvas.min.js')).byteLength;
    expect(size).toBeGreaterThan(10_000);
  });
});
