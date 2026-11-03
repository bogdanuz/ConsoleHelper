/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const toolsJson = JSON.parse(readFileSync(join(root, 'public/tools.json'), 'utf8')) as {
  id: string;
  file: string;
  name: string;
}[];

describe('launcher / tools smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { __ch_menu_cleanup?: () => void }).__ch_menu_cleanup?.();
    delete (window as unknown as { __ch_menu?: HTMLElement }).__ch_menu;
    delete (window as unknown as { __CH_BASE__?: string }).__CH_BASE__;
    delete (window as unknown as { __ch_hotkeyBound?: boolean }).__ch_hotkeyBound;
  });

  afterEach(() => {
    (window as unknown as { __ch_menu_cleanup?: () => void }).__ch_menu_cleanup?.();
    (window as unknown as { __ch_menu?: HTMLElement }).__ch_menu?.remove();
  });

  it('tools.json lists files that exist on disk', () => {
    for (const t of toolsJson) {
      const name = t.file.replace(/^tools\//, '');
      const path = join(root, 'public/tools', name);
      expect(() => readFileSync(path, 'utf8')).not.toThrow();
      expect(readFileSync(path, 'utf8').length).toBeGreaterThan(20);
    }
  });

  it('opens menu from launcher.js with mocked fetch', async () => {
    (window as unknown as { __CH_BASE__: string }).__CH_BASE__ =
      'https://example.com/ConsoleHelper/tools/';

    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('tools.json')) {
        return {
          ok: true,
          json: async () => toolsJson,
        } as Response;
      }
      return { ok: false, json: async () => [] } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const code = readFileSync(join(root, 'public/tools/launcher.js'), 'utf8');
    // eslint-disable-next-line no-eval
    await (0, eval)(code);

    await vi.waitFor(() => {
      expect(document.querySelector('[data-ch="1"]')).toBeTruthy();
    });

    const box = document.querySelector('[data-ch="1"]') as HTMLElement;
    expect(box.querySelector('input')).toBeTruthy();
    const credit = box.querySelector('a') as HTMLAnchorElement;
    expect(credit.href).toBe('https://github.com/bogdanuz');
    expect(credit.target).toBe('_blank');
    expect(credit.textContent).toBe('github.com/bogdanuz');
    const buttons = box.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect([...buttons].some((b) => /таблица|таблиц|Скриншот|DOM/i.test(b.textContent || ''))).toBe(
      true,
    );

    const input = box.querySelector('input') as HTMLInputElement;
    input.value = 'скрин';
    input.dispatchEvent(new Event('input'));
    expect(box.querySelectorAll('button').length).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[data-ch="1"]')).toBeNull();
  });

  it('dom-tables finds HTML table on fixture markup', () => {
    document.body.innerHTML = `
      <h1>Demo</h1>
      <table id="demo">
        <tr><th>Name</th><th>Budget</th></tr>
        <tr><td>Alpha</td><td>100</td></tr>
        <tr><td>Beta</td><td>200</td></tr>
        <tr><td>Gamma</td><td>300</td></tr>
      </table>`;

    // jsdom reports 0×0 boxes; tool skips invisible nodes — stub geometry
    for (const node of document.querySelectorAll('table, td, th, tr, body, div')) {
      (node as HTMLElement).getBoundingClientRect = () =>
        ({
          width: 200,
          height: 40,
          top: 0,
          left: 0,
          bottom: 40,
          right: 200,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          },
        }) as DOMRect;
    }

    expect(document.querySelector('table')!.rows.length).toBe(4);

    const code = readFileSync(join(root, 'public/tools/dom-tables.js'), 'utf8');
    // eslint-disable-next-line no-eval
    (0, eval)(code);
    const info = document.querySelector('#__tp_ui span');
    expect(info?.textContent).toMatch(/Таблиц:\s*[1-9]/);
    (window as unknown as { __tp: { destroy: () => void } }).__tp.destroy();
  });
});
