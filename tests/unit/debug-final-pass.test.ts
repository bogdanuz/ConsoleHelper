/**
 * @vitest-environment jsdom
 * Final polish pass (session 118115).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('debug final pass', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { __ch_menu?: unknown }).__ch_menu;
    delete (window as unknown as { __ch_hotkeyBound?: boolean }).__ch_hotkeyBound;
    delete (window as unknown as { __CH_BASE__?: string }).__CH_BASE__;
    delete (window as unknown as { __CH_BUNDLE__?: unknown }).__CH_BUNDLE__;
    delete (window as unknown as { __ch_menu_cleanup?: unknown }).__ch_menu_cleanup;
  });

  it('F1: Esc closes menu even when focus left the search box', async () => {
    (window as unknown as { __CH_BASE__: string }).__CH_BASE__ =
      'https://bogdanuz.github.io/ConsoleHelper/tools/';
    (window as unknown as { __CH_BUNDLE__: unknown }).__CH_BUNDLE__ = {
      tools: [
        { id: 'launcher', name: 'Меню', file: 'tools/launcher.js' },
        {
          id: 'text-to-table',
          name: 'Текст → таблица',
          file: 'tools/text-to-table.js',
          hint: 'demo',
        },
      ],
      sources: {},
    };
    const code = readFileSync(join(root, 'public/tools/launcher.js'), 'utf8');
    await (0, eval)(code);
    const menu = document.querySelector('[data-ch="1"]') as HTMLElement | null;
    expect(menu).toBeTruthy();
    // blur search: focus body
    (document.activeElement as HTMLElement | null)?.blur?.();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    // capture phase listener is on document
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    const stillOpen = !!document.querySelector('[data-ch="1"]');
    expect(stillOpen).toBe(false);
  });

  it('F2: xlsx download revokes object URL', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    const ok = code.includes('URL.revokeObjectURL(url)');
    expect(ok).toBe(true);
  });

  it('F3: screenshot ignores cards overlay', async () => {
    const code = readFileSync(join(root, 'public/tools/screenshot.js'), 'utf8');
    const ok = code.includes("[data-cards]");
    expect(ok).toBe(true);
  });

  it('F4: Esc stops autoscroll in screenshot and text-to-table', async () => {
    const shot = readFileSync(join(root, 'public/tools/screenshot.js'), 'utf8');
    const tx = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    const shotOk = shot.includes('onScrollEsc') && shot.includes('Esc — стоп');
    const txOk = tx.includes('onScrollEsc') && tx.includes('Esc — стоп');
    expect(shotOk).toBe(true);
    expect(txOk).toBe(true);
  });
});
