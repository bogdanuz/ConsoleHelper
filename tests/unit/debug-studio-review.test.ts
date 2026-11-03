/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function agentLog(hypothesisId: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  await fetch('http://127.0.0.1:7598/ingest/4014ccc8-bfd9-4c38-8e8e-eed0edada4f3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '118115' },
    body: JSON.stringify({
      sessionId: '118115',
      runId: 'review4',
      hypothesisId,
      location: 'debug-studio-review.test.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

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
    const selectedCount = (box.textContent || '').includes('Выбрано: 2') || (box.textContent || '').includes('Выбрано: 1');
    const sumText = box.textContent || '';

    const filtered = api.getExportRows();

    const hide = [...box.querySelectorAll('button')].find((b) => b.textContent === 'Скрыть');
    hide?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const afterHide = api.getExportRows();

    const undo = [...box.querySelectorAll('button')].find((b) => b.textContent === 'Шаг назад');
    undo?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const afterUndo = api.getExportRows();

    await agentLog('H6', 'click after drag', {
      selectedLooksOn: selectedCount,
      stillTwo: /Выбрано:\s*2/.test(sumText),
      droppedToOne: /Выбрано:\s*1/.test(sumText) && !/Выбрано:\s*2/.test(sumText),
    });
    await agentLog('H1', 'drag and export', {
      selectedLooksOn: selectedCount,
      filtered,
      afterHide,
      afterUndo,
      percentInSum: /Сумма:\s*74/.test(sumText) || /Сумма:\s*75/.test(sumText),
    });
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
    await agentLog('H5', 'header hint on data rows', { hint });
    expect(hint).toBe(false);
    api.destroy();
  });
});
