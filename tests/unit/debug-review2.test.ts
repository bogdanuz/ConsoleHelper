/**
 * @vitest-environment jsdom
 * Second-pass Wave B review (session 118115).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('debug review2', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('H6: text-to-table collects before restoring scroll', async () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    const autoBlock = code.slice(code.indexOf('autoScrollThenRun'), code.indexOf('const panel'));
    const runIdx = autoBlock.indexOf('run(null)');
    const restoreIdx = autoBlock.indexOf('window.scrollTo(0, startY)');
    const goodOrder = runIdx >= 0 && restoreIdx > runIdx;
    const badOrder = /window\.scrollTo\(0, startY\);[\s\S]*run\(null\)/.test(autoBlock);
    expect(goodOrder).toBe(true);
    expect(badOrder).toBe(false);
  });

  it('H7: text-to-table and dom-tables destroy before remount', async () => {
    const tx = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    const dom = readFileSync(join(root, 'public/tools/dom-tables.js'), 'utf8');
    const txOk = /studioApi\?\.destroy\?\.\(\);\s*studioApi = Studio\.mount/.test(tx);
    const domOk = /studioApi\?\.destroy\?\.\(\);\s*studioApi = Studio\.mount/.test(dom);
    expect(txOk).toBe(true);
    expect(domOk).toBe(true);
  });

  it('H8: cards Excel has fallback .xls', async () => {
    const code = readFileSync(join(root, 'public/tools/cards-to-table.js'), 'utf8');
    const hasFallback = code.includes('запасной .xls') && code.includes('toExcelHtml');
    expect(hasFallback).toBe(true);
  });

  it('H9: empty-filter toggle label + truncation note', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    const rows = Array.from({ length: 12 }, (_, i) => [String(i), i % 2 ? '' : 'x']);
    Studio.mount(box, { rows, maxRows: 5 });
    const emptyBtn = [...box.querySelectorAll('button')].find((b) =>
      /непустые/i.test(b.textContent || ''),
    ) as HTMLButtonElement;
    emptyBtn.click();
    const labelOn = emptyBtn.textContent || '';
    const sum = [...box.querySelectorAll('div')].map((d) => d.textContent || '').find((t) =>
      /Показаны/.test(t),
    );
    expect(labelOn).toMatch(/ВКЛ/i);
    expect(sum).toMatch(/Показаны 5 из/);
  });

  it('H10: hub catalog builds cards without innerHTML template', async () => {
    const main = readFileSync(join(root, 'src/main.ts'), 'utf8');
    const usesUnsafe =
      /item\.innerHTML\s*=\s*`[\s\S]*card-title[\s\S]*\$\{t\.name\}/.test(main);
    const usesText = main.includes("title.textContent = t.name");
    expect(usesUnsafe).toBe(false);
    expect(usesText).toBe(true);
  });
});
