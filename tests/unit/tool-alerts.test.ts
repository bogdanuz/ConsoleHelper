/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('tool errors stay in the panel', () => {
  it('text and card tools do not open a browser alert', () => {
    for (const file of ['public/tools/text-to-table.js', 'public/tools/cards-to-table.js']) {
      const code = readFileSync(join(root, file), 'utf8');
      expect(code, file).not.toMatch(/alert\s*\(/);
    }
  });

  it('text tool names the two capture actions in short words', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    expect(code).toContain("'Вся страница'");
    expect(code).toContain("'Прокрутить и собрать'");
    expect(code).toContain('Текст в этой области не найден');
  });

  it('shows the missing-text note on the panel instead of a browser window', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    (0, eval)(code);
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Вся страница');
    button?.click();
    expect(document.body.textContent || '').toContain('Текст в этой области не найден');
    (window as unknown as { __tx?: { destroy: () => void } }).__tx?.destroy();
  });

  it('shows a missing-cards note on the panel', () => {
    const code = readFileSync(join(root, 'public/tools/cards-to-table.js'), 'utf8');
    (0, eval)(code);
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Вся видимая зона');
    button?.click();
    expect(document.body.textContent || '').toContain('Карточки не найдены');
    (window as unknown as { __cards?: { destroy: () => void } }).__cards?.destroy();
  });
});
