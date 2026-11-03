/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('table-studio tool', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('mounts editable grid and supports delete + getRows', () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function; toCsv: Function } })
      .__CH_Studio;
    expect(Studio?.mount).toBeTypeOf('function');

    const box = document.getElementById('box')!;
    let latest: string[][] = [];
    const api = Studio.mount(box, {
      rows: [
        ['A', 'B'],
        ['C', 'D'],
      ],
      onChange: (r: string[][]) => {
        latest = r;
      },
    }) as { getRows: () => string[][]; destroy: () => void };

    expect(box.querySelectorAll('tr').length).toBeGreaterThan(2);
    const dataRow = box.querySelectorAll('tr')[1]!;
    const editable = [...dataRow.querySelectorAll('td')].find(
      (td) => (td as HTMLElement).isContentEditable || td.getAttribute('contenteditable') != null,
    ) as HTMLElement;
    expect(editable).toBeTruthy();
    editable.textContent = 'Z';
    editable.dispatchEvent(new Event('blur'));
    expect(api.getRows()[0]![0]).toBe('Z');

    const del = dataRow.querySelector('button') as HTMLButtonElement;
    del.click();
    expect(api.getRows().length).toBe(1);
    expect(latest.length).toBe(1);

    expect(Studio.toCsv([['a', 'b']])).toContain('"a";"b"');
    api.destroy();
  });

  it('text-to-table loads table-studio by name', () => {
    const tx = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    expect(tx).toContain('table-studio.js');
    expect(tx).toContain('CSV');
    expect(tx).toContain('__CH_Studio');
  });
});
