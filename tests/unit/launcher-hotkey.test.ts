/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const toolsJson = JSON.parse(readFileSync(join(root, 'public/tools.json'), 'utf8'));

describe('launcher hotkey', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';
    delete (window as unknown as { __ch_menu?: HTMLElement }).__ch_menu;
    delete (window as unknown as { __ch_hotkeyBound?: boolean }).__ch_hotkeyBound;
    delete (window as unknown as { __ch_openMenu?: unknown }).__ch_openMenu;
    delete (window as unknown as { __CH_BASE__?: string }).__CH_BASE__;
    delete (window as unknown as { __ch_toast?: HTMLElement }).__ch_toast;
  });

  afterEach(() => {
    (window as unknown as { __ch_menu?: HTMLElement }).__ch_menu?.remove();
    (window as unknown as { __ch_toast?: HTMLElement }).__ch_toast?.remove();
  });

  it('binds Alt+Shift+H and reopens menu without re-eval', async () => {
    (window as unknown as { __CH_BASE__: string }).__CH_BASE__ =
      'https://example.com/ConsoleHelper/tools/';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('tools.json')) {
          return { ok: true, json: async () => toolsJson } as Response;
        }
        return { ok: false, json: async () => [] } as Response;
      }),
    );

    const code = readFileSync(join(root, 'public/tools/launcher.js'), 'utf8');
    await (0, eval)(code);
    await vi.waitFor(() => expect(document.querySelector('[data-ch="1"]')).toBeTruthy());
    expect((window as unknown as { __ch_hotkeyBound: boolean }).__ch_hotkeyBound).toBe(true);

    document.querySelector('[data-ch="1"]')?.remove();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, shiftKey: true, code: 'KeyH', bubbles: true }),
    );
    await vi.waitFor(() => expect(document.querySelector('[data-ch="1"]')).toBeTruthy());
    expect(document.querySelector('[data-ch="1"]')?.textContent).toMatch(/Alt\+Shift\+H/);
  });
});
