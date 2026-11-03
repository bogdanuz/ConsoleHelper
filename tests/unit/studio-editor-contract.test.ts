/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyCaptureModes } from '../../src/core/captureModes';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

type Api = {
  getExportRows: () => string[][];
  getRows: () => string[][];
  destroy: () => void;
};

function mount(rows: string[][], maxRows?: number) {
  const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
  (0, eval)(code);
  const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
  const box = document.getElementById('box')!;
  const api = Studio.mount(box, { rows, maxRows }) as Api;
  return { box, api };
}

function button(box: HTMLElement, name: string) {
  return [...box.querySelectorAll('button')].find((b) => b.textContent === name) as HTMLButtonElement;
}

describe('studio editor contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('does not sum a percent as a plain number', () => {
    const { box, api } = mount([
      ['A', '74%'],
      ['B', '10'],
    ]);
    const percent = box.querySelectorAll('tr')[1]!.querySelectorAll('td')[2] as HTMLElement;
    percent.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(box.textContent).toContain('нет чисел');
    expect(box.textContent).not.toMatch(/Сумма:\s*74/);
    api.destroy();
  });

  it('column header selects the visible number column', () => {
    const { box, api } = mount([
      ['A', '10'],
      ['B', '5'],
    ]);
    const header = box.querySelectorAll('th')[2] as HTMLElement;
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(box.textContent).toMatch(/Сумма:\s*15/);
    api.destroy();
  });

  it('header switch moves the first row into the file header and undo puts it back', () => {
    const { box, api } = mount([
      ['Name', 'Budget'],
      ['Alpha', '10'],
    ]);
    button(box, 'Первая строка — заголовки').click();
    expect(api.getExportRows()[0]).toEqual(['Name', 'Budget']);
    expect(api.getRows()).toEqual([['Alpha', '10']]);
    button(box, 'Шаг назад').click();
    expect(api.getRows()[0]).toEqual(['Name', 'Budget']);
    api.destroy();
  });

  it('does not suggest headers when the first row already has a number', () => {
    const { box, api } = mount([
      ['Alpha', '100'],
      ['Beta', '200'],
    ]);
    expect(box.textContent).not.toContain('Похоже, первая строка');
    api.destroy();
  });

  it('compacts numbers on open and restores them when turned off', () => {
    const { box, api } = mount([['10 000', '20 000']]);
    expect(api.getRows()[0]).toEqual(['10000', '20000']);
    button(box, 'Числа без пробелов: ВКЛ').click();
    expect(api.getRows()[0]).toEqual(['10 000', '20 000']);
    api.destroy();
  });

  it('embedded capture modes match core', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    (0, eval)(code);
    const api = (
      window as unknown as {
        __tx: {
          _test: { applyCaptureModes: Function };
          destroy: () => void;
        };
      }
    ).__tx;
    const rows = [
      ['Sample catalog item Alpha', '100'],
      ['ID-1001-A', ''],
    ];
    const embedded = api._test.applyCaptureModes(rows, null, false, true, 8).rows;
    expect(embedded).toEqual(applyCaptureModes({ rows, codeColumn: true }).rows);
    api.destroy();
  });
});
