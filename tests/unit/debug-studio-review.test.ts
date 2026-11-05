/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('studio review', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('H1-H4 editor behaviors', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    const api = Studio.mount(box, {
      rows: [
        ['Name', '10000', '74%'],
        ['Beta', '5', '1%'],
        ['HideMe', '', ''],
      ],
    }) as { getExportRows: () => string[][]; destroy: () => void };

    const cell = () => box.querySelectorAll('tr')[1]!.querySelectorAll('td')[1] as HTMLElement;
    const next = () => box.querySelectorAll('tr')[1]!.querySelectorAll('td')[2] as HTMLElement;
    cell().dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    next().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, buttons: 1 }));
    next().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const sumText = box.textContent || '';

    const filtered = api.getExportRows();

    const hide = [...box.querySelectorAll('button')].find((b) => b.textContent === 'Скрыть');
    hide?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const undo = [...box.querySelectorAll('button')].find((b) => b.textContent === 'Шаг назад');
    undo?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const afterUndo = api.getExportRows();

    expect(/Выбрано:\s*2/.test(sumText)).toBe(true);
    expect(filtered.some((row) => row[0] === 'HideMe')).toBe(true);
    expect(afterUndo[0]?.[0]).toBe('Name');
    api.destroy();
  });

  it('H5 header hint on a normal number row', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    const api = Studio.mount(box, {
      rows: [
        ['Alpha', '100'],
        ['Beta', '200'],
      ],
    }) as { destroy: () => void };
    const hint = /Похоже, первая строка/.test(box.textContent || '');
    expect(hint).toBe(false);
    api.destroy();
  });
});
