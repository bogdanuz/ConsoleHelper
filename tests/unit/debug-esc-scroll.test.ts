/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('esc during autoscroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>Demo line</p>';
    window.scrollTo = () => undefined;
    delete (window as unknown as { __tx?: unknown }).__tx;
    delete (window as unknown as { __ch_shot?: unknown }).__ch_shot;
  });

  it('H1: text-to-table Esc during scroll', async () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    (0, eval)(code);
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /Прокрутить и собрать/.test(b.textContent || ''),
    ) as HTMLButtonElement;
    btn.click();
    const pace = [...document.querySelectorAll('button')].find((b) =>
      /Обычная лента/.test(b.textContent || ''),
    ) as HTMLButtonElement;
    pace.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const alive = !!(window as unknown as { __tx?: unknown }).__tx;
    expect(alive).toBe(true);
    (window as unknown as { __tx?: { destroy: () => void } }).__tx?.destroy();
  });

  it('H2: screenshot Esc during scroll', async () => {
    const code = readFileSync(join(root, 'public/tools/screenshot.js'), 'utf8');
    (0, eval)(code);
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /подгружается/i.test(b.textContent || ''),
    ) as HTMLButtonElement;
    btn.click();
    const pace = [...document.querySelectorAll('button')].find((b) =>
      /Обычная лента/.test(b.textContent || ''),
    ) as HTMLButtonElement;
    pace.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const alive = !!(window as unknown as { __ch_shot?: unknown }).__ch_shot;
    expect(alive).toBe(true);
    (window as unknown as { __ch_shot?: { destroy: () => void } }).__ch_shot?.destroy?.();
  });
});
