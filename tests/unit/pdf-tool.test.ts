/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alignLines, reconcileGlyphs } from '../../src/core/pdfReconcile';
import { smartTableRows } from '../../src/core/pdfView';
import { filterGlyphs, glyphsToGrid, glyphsToPlainText } from '../../src/core/pdfText';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('pdf tool', () => {
  beforeEach(() => {
    (window as unknown as { __pdf?: { destroy: () => void } }).__pdf?.destroy?.();
    document.querySelectorAll('[data-pdf]').forEach((node) => node.remove());
    document.body.innerHTML = '';
    delete (window as unknown as { __pdf?: { destroy: () => void } }).__pdf;
  });

  afterEach(() => {
    (window as unknown as { __pdf?: { destroy: () => void } }).__pdf?.destroy?.();
    document.querySelectorAll('[data-pdf]').forEach((node) => node.remove());
  });

  it('uses the same text layout as core and stays a separate tool', () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    expect(code).toContain('Выбрать PDF');
    expect(code).toContain('Обведённый кусок');
    expect(code).toContain('Как на странице');
    expect(code).not.toContain('127.0.0.1');
    expect(code).not.toContain('max-height:150px');
    expect(code).toContain('Таблица');
    expect(code).toContain('textarea');
    expect(code).not.toContain('text-to-table.js');
    (0, eval)(code);
    const api = (window as unknown as { __pdf: { _test: { filterGlyphs: typeof filterGlyphs; glyphsToPlainText: typeof glyphsToPlainText; glyphsToGrid: typeof glyphsToGrid; reconcileGlyphs: typeof reconcileGlyphs; alignLines: typeof alignLines; smartTableRows: typeof smartTableRows; wordsToGlyphs: (data: unknown, vp: { convertToPdfPoint: (x: number, y: number) => number[] }) => { glyphs: Array<{ text: string }>; lines: string[] } }; destroy: () => void } }).__pdf;
    const items = [
      { text: 'A', x: 0, y: 20, w: 10, h: 8 },
      { text: 'B', x: 40, y: 20, w: 10, h: 8 },
    ];
    expect(api._test.glyphsToPlainText(items)).toBe(glyphsToPlainText(items));
    expect(api._test.glyphsToGrid(items)).toEqual(glyphsToGrid(items));
    expect(api._test.filterGlyphs(items, { x1: 0, y1: 0, x2: 20, y2: 30 }).map((item) => item.text)).toEqual(
      filterGlyphs(items, { x1: 0, y1: 0, x2: 20, y2: 30 }).map((item) => item.text),
    );
    const file = [{ text: 'Budget', x: 10, y: 100, w: 40, h: 10 }];
    const image = [
      { text: 'Budget', x: 11, y: 100, w: 40, h: 10 },
      { text: '100', x: 80, y: 100, w: 20, h: 10 },
    ];
    expect(api._test.reconcileGlyphs(file, image)).toEqual(reconcileGlyphs(file, image));
    expect(api._test.alignLines(file, image)).toEqual(alignLines(file, image));
    const stacked = [
      { text: 'Budget', x: 10, y: 100, w: 50, h: 12 },
      { text: '100', x: 90, y: 100, w: 30, h: 12 },
      { text: 'ID-12', x: 10, y: 80, w: 40, h: 12 },
    ];
    expect(api._test.smartTableRows(stacked)).toEqual(smartTableRows(stacked));
    const vp = { convertToPdfPoint: (x: number, y: number) => [x, 200 - y] };
    const recognized = api._test.wordsToGlyphs(
      {
        lines: [
          {
            text: 'Budget 100 шт',
            bbox: { x0: 10, y0: 10, x1: 140, y1: 24 },
            words: [
              { text: 'Budget', confidence: 90, bbox: { x0: 10, y0: 10, x1: 60, y1: 24 } },
              { text: '100', confidence: 90, bbox: { x0: 80, y0: 10, x1: 110, y1: 24 } },
            ],
          },
        ],
      },
      vp,
    );
    expect(recognized.glyphs.map((item) => item.text)).toEqual(['Budget', '100']);
    expect(recognized.lines[0]).toBe('Budget 100 шт');
    api.destroy();
  });

  it('asks to draw an area before taking a region', () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    const click = (label: string) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label)?.click();
    const statusText = () => document.querySelector('[data-pdf-status]')?.textContent || '';
    click('Обведённый кусок');
    expect(statusText()).toContain('обведи область');
    click('Эта страница');
    expect(statusText()).toContain('выбери PDF');
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('shows a hint and copies the text that is in the field', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    const pageBtn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Эта страница');
    pageBtn?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const hint = [...document.querySelectorAll('div')].map((node) => node.textContent || '').find((text) =>
      text.includes('как на странице'),
    );
    expect(hint).toBeTruthy();
    const field = document.querySelector('textarea');
    expect(field).toBeTruthy();
    field!.value = 'Строка из файла';
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { copied = text; } },
    });
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Таблица')?.click();
    const copyBtn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Скопировать');
    expect(copyBtn?.parentElement?.style.display || '').not.toBe('none');
    copyBtn?.click();
    await Promise.resolve();
    expect(copied).toBe('Строка из файла');
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('closes the pdf table with the button and with Escape', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    let mounted = 0;
    (window as unknown as { __CH_Studio: { mount: () => { destroy: () => void } } }).__CH_Studio = {
      mount: () => {
        mounted += 1;
        return { destroy() { mounted -= 1; } };
      },
    };
    const api = (window as unknown as { __pdf: { _test: { openTableRows: (rows: string[][]) => Promise<void> }; destroy: () => void } }).__pdf;
    await api._test.openTableRows([['Budget', '100']]);
    expect(document.querySelector('[data-pdf-table]')).toBeTruthy();
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Закрыть таблицу')?.click();
    expect(document.querySelector('[data-pdf-table]')).toBeNull();
    expect(mounted).toBe(0);
    await api._test.openTableRows([['Budget', '100']]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[data-pdf-table]')).toBeNull();
    api.destroy();
  });

  it('reads a second PDF instead of the picture from the first one', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const fetched: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetched.push(url);
      const bytes = new Uint8Array([1, 2, 3, 4]);
      return new Response(bytes, { status: 200, headers: { 'content-length': '4' } });
    }) as typeof fetch;
    let which = 'Alpha';
    const recognized: string[] = [];
    (window as unknown as { pdfjsLib: unknown }).pdfjsLib = {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          getPage: async () => ({
            getViewport: () => ({
              width: 200,
              height: 120,
              convertToPdfPoint: (x: number, y: number) => [x, 120 - y],
            }),
            render: () => ({ promise: Promise.resolve() }),
            getTextContent: async () => ({
              items: [{ str: which, transform: [1, 0, 0, 1, 10, 80], width: 40, height: 12 }],
            }),
          }),
        }),
      }),
      GlobalWorkerOptions: {},
    };
    (window as unknown as { Tesseract: unknown }).Tesseract = {
      createWorker: async () => ({
        recognize: async () => {
          const text = which === 'Alpha' ? 'One' : 'Two';
          recognized.push(text);
          return { data: { words: [{ text, confidence: 90, bbox: { x0: 120, y0: 30, x1: 160, y1: 48 } }] } };
        },
        terminate: async () => {},
      }),
    };
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const open = async (name: string) => {
      which = name;
      const raw = new Uint8Array([37, 80, 68, 70]);
      const file = new File([raw], name + '.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: async () => raw.buffer });
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      await input.onchange?.(new Event('change'));
      const field = document.querySelector('textarea');
      const started = Date.now();
      while (Date.now() - started < 2000) {
        if ((field?.value || '').includes(name === 'Alpha' ? 'One' : 'Two')) return field?.value || '';
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return field?.value || '';
    };
    const first = await open('Alpha');
    const second = await open('Beta');
    globalThis.fetch = originalFetch;
    expect(first, document.querySelector('[data-pdf-status]')?.textContent || 'no-status').toContain('Alpha');
    expect(first).toContain('One');
    expect(second).toContain('Beta');
    expect(second).toContain('Two');
    expect(second).not.toContain('One');
    expect(recognized).toEqual(['One', 'Two']);
    expect(fetched.some((url) => url.includes('jsdelivr') || url.includes('cdn.jsdelivr'))).toBe(false);
    const compare = [...document.querySelectorAll('div')].map((node) => node.textContent || '');
    expect(compare.some((text) => text === 'Из файла')).toBe(true);
    expect(compare.some((text) => text === 'С картинки')).toBe(true);
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('keeps the page you returned to when an older page finishes later', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-length': '4' } })) as typeof fetch;
    (window as unknown as { Tesseract: unknown }).Tesseract = {
      createWorker: async () => ({
        recognize: async () => ({ data: { words: [] } }),
        terminate: async () => {},
      }),
    };
    const waiting: Record<number, Array<() => void>> = { 1: [], 2: [] };
    (window as unknown as { pdfjsLib: unknown }).pdfjsLib = {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 2,
          getPage: async (n: number) => ({
            getViewport: () => ({
              width: 100,
              height: 100,
              convertToPdfPoint: (x: number, y: number) => [x, 100 - y],
            }),
            render: () => ({
              promise: new Promise<void>((resolve) => waiting[n].push(resolve)),
            }),
            getTextContent: async () => ({
              items: [{ str: n === 1 ? 'PageOne' : 'PageTwo', transform: [1, 0, 0, 1, 10, 40], width: 40, height: 10 }],
            }),
          }),
        }),
      }),
      GlobalWorkerOptions: {},
    };
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const raw = new Uint8Array([37, 80, 68, 70]);
    const file = new File([raw], 'pages.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: async () => raw.buffer });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    const opening = input.onchange?.(new Event('change'));
    const until = async (ready: () => boolean) => {
      const started = Date.now();
      while (!ready()) {
        if (Date.now() - started > 1000) throw new Error('page render did not start');
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };
    await until(() => waiting[1].length > 0);
    waiting[1].shift()?.();
    await opening;
    const click = (label: string) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label)?.click();
    click('→');
    click('←');
    await until(() => waiting[1].length > 0 || waiting[2].length > 0);
    while (waiting[1].length) waiting[1].shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    while (waiting[2].length) waiting[2].shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const field = document.querySelector('textarea')?.value || '';
    expect(field).toContain('PageOne');
    expect(field).not.toContain('PageTwo');
    globalThis.fetch = originalFetch;
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('does not keep the previous file picture if recognition finishes during the next open', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-length': '4' } });
    }) as typeof fetch;
    const pending: Array<() => void> = [];
    let opens = 0;
    let releaseSecond: (() => void) | null = null;
    const docFor = (name: string) => ({
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({ width: 200, height: 100, convertToPdfPoint: (x: number, y: number) => [x, 100 - y] }),
        render: () => ({ promise: Promise.resolve() }),
        getTextContent: async () => ({
          items: [{ str: name, transform: [1, 0, 0, 1, 10, 40], width: 40, height: 10 }],
        }),
      }),
    });
    (window as unknown as { pdfjsLib: unknown }).pdfjsLib = {
      getDocument: () => {
        opens += 1;
        const name = opens === 1 ? 'Alpha' : 'Beta';
        const doc = docFor(name);
        if (opens === 1) return { promise: Promise.resolve(doc) };
        return { promise: new Promise((resolve) => { releaseSecond = () => resolve(doc); }) };
      },
      GlobalWorkerOptions: {},
    };
    (window as unknown as { Tesseract: unknown }).Tesseract = {
      createWorker: async () => ({
        recognize: () => new Promise((resolve) => {
          const text = opens === 1 ? 'One' : 'Two';
          pending.push(() => resolve({ data: { words: [{ text, confidence: 90, bbox: { x0: 120, y0: 20, x1: 160, y1: 36 } }] } }));
        }),
        terminate: async () => {},
      }),
    };
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const choose = (name: string) => {
      const raw = new Uint8Array([37, 80, 68, 70]);
      const file = new File([raw], name + '.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: async () => raw.buffer });
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      return input.onchange?.(new Event('change'));
    };
    const firstOpen = choose('Alpha');
    const started = Date.now();
    while (!pending.length) {
      if (Date.now() - started > 1000) throw new Error('recognition did not start');
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const secondOpen = choose('Beta');
    const startedHold = Date.now();
    while (!releaseSecond) {
      if (Date.now() - startedHold > 1000) throw new Error('second file did not reach open');
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    pending.shift()?.();
    const openSecond = releaseSecond as (() => void) | null;
    if (!openSecond) throw new Error('second file did not reach open');
    openSecond();
    await Promise.all([firstOpen, secondOpen]);
    const startedSecond = Date.now();
    while (!pending.length) {
      if (Date.now() - startedSecond > 1000) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    pending.shift()?.();
    const startedWait = Date.now();
    let field = '';
    while (Date.now() - startedWait < 1500) {
      field = document.querySelector('textarea')?.value || '';
      if (field.includes('Two') || field.includes('One')) break;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    globalThis.fetch = originalFetch;
    expect(field).toContain('Beta');
    expect(field).toContain('Two');
    expect(field).not.toContain('One');
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('does not paste the previous page letters while the next page is still opening', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-length': '4' } });
    }) as typeof fetch;
    const waiting: Record<number, Array<() => void>> = { 1: [], 2: [] };
    (window as unknown as { pdfjsLib: unknown }).pdfjsLib = {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 2,
          getPage: async (n: number) => ({
            getViewport: () => ({ width: 120, height: 80, convertToPdfPoint: (x: number, y: number) => [x, 80 - y] }),
            render: () => ({ promise: n === 1 ? Promise.resolve() : new Promise<void>((resolve) => waiting[2].push(resolve)) }),
            getTextContent: async () => ({
              items: [{ str: n === 1 ? 'PageOne' : 'PageTwo', transform: [1, 0, 0, 1, 10, 40], width: 40, height: 10 }],
            }),
          }),
        }),
      }),
      GlobalWorkerOptions: {},
    };
    (window as unknown as { Tesseract: unknown }).Tesseract = {
      createWorker: async () => ({
        recognize: async () => ({ data: { words: [] } }),
        terminate: async () => {},
      }),
    };
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const raw = new Uint8Array([37, 80, 68, 70]);
    const file = new File([raw], 'pages.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: async () => raw.buffer });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await input.onchange?.(new Event('change'));
    const click = (label: string) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label)?.click();
    click('→');
    click('Эта страница');
    const started = Date.now();
    let field = document.querySelector('textarea')?.value || '';
    while (Date.now() - started < 1500) {
      while (waiting[2].length) waiting[2].shift()?.();
      field = document.querySelector('textarea')?.value || '';
      if (field.includes('PageTwo')) break;
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    globalThis.fetch = originalFetch;
    expect(field).toContain('PageTwo');
    expect(field).not.toContain('PageOne');
    (window as unknown as { __pdf: { destroy: () => void } }).__pdf.destroy();
  });

  it('downloads Excel in the same window and keeps the tool when folded', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    const reconcile = readFileSync(join(root, 'src/core/pdfReconcile.ts'), 'utf8');
    expect(reconcile).not.toContain('127.0.0.1');
    (0, eval)(code);
    const status = () => document.querySelector('[data-pdf-status]')?.textContent || '';
    const button = (label: string) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label) as HTMLButtonElement;
    const api = (
      window as unknown as {
        __pdf: {
          destroy: () => void;
          _test: { setMerged: (glyphs: Array<{ text: string; x: number; y: number; w: number; h: number }>) => void };
        };
      }
    ).__pdf;

    button('Скачать Excel').click();
    expect(status()).toContain('Сначала выбери, что показать сверху');

    const calls: string[][][] = [];
    const gate: { release: ((ok: boolean) => void) | null } = { release: null };
    (window as unknown as { __CH_Studio: { mount: () => object; downloadXlsx: (rows: string[][]) => Promise<boolean> } }).__CH_Studio = {
      mount: () => ({}),
      downloadXlsx: (rows) =>
        new Promise((resolve) => {
          calls.push(rows);
          gate.release = resolve;
        }),
    };
    api._test.setMerged([
      { text: 'Budget', x: 0, y: 20, w: 40, h: 10 },
      { text: '100', x: 80, y: 20, w: 20, h: 10 },
    ]);
    button('Скачать Excel').click();
    button('Скачать Excel').click();
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.some((row) => row.includes('Budget'))).toBe(true);
    gate.release?.(true);
    await vi.waitFor(() => expect(status()).toContain('Excel скачан'));

    button('Таблица').click();
    expect(button('Скачать Excel').parentElement?.style.display || '').not.toBe('none');

    button('Свернуть окно').click();
    expect((window as unknown as { __pdf?: unknown }).__pdf).toBeTruthy();
    button('Закрыть инструмент').click();
    expect((window as unknown as { __pdf?: unknown }).__pdf).toBeUndefined();
  });

  it('saves a fallback spreadsheet when the Excel library does not open', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    const downloads: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      downloads.push(this.download);
    };
    const originalUrl = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:demo';
    URL.revokeObjectURL = () => undefined;
    (window as unknown as { __CH_Studio: { mount: () => object; downloadXlsx: () => Promise<boolean> } }).__CH_Studio = {
      mount: () => ({}),
      downloadXlsx: async () => false,
    };
    const api = (
      window as unknown as {
        __pdf: {
          destroy: () => void;
          _test: { setMerged: (glyphs: Array<{ text: string; x: number; y: number; w: number; h: number }>) => void };
        };
      }
    ).__pdf;
    api._test.setMerged([{ text: 'Budget', x: 0, y: 20, w: 40, h: 10 }]);
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Скачать Excel')?.click();
    await vi.waitFor(() => expect(downloads.some((name) => name.endsWith('.xls'))).toBe(true));
    expect(document.querySelector('[data-pdf-status]')?.textContent || '').toContain('запасной');
    HTMLAnchorElement.prototype.click = original;
    URL.createObjectURL = originalUrl;
    URL.revokeObjectURL = originalRevoke;
    api.destroy();
  });

  it('still saves a fallback file when the Excel library throws, and the button can be used again', async () => {
    const code = readFileSync(join(root, 'public/tools/pdf-to-text.js'), 'utf8');
    (0, eval)(code);
    const downloads: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      downloads.push(this.download);
    };
    const originalUrl = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:demo';
    URL.revokeObjectURL = () => undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
    const api = (
      window as unknown as {
        __pdf: {
          destroy: () => void;
          _test: { setMerged: (glyphs: Array<{ text: string; x: number; y: number; w: number; h: number }>) => void };
        };
      }
    ).__pdf;
    api._test.setMerged([{ text: 'Budget', x: 0, y: 20, w: 40, h: 10 }]);
    const excel = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Скачать Excel');
    excel?.click();
    await vi.waitFor(() => expect(downloads.some((name) => name.endsWith('.xls'))).toBe(true));
    (window as unknown as { __CH_Studio: { mount: () => object; downloadXlsx: () => Promise<boolean> } }).__CH_Studio = {
      mount: () => ({}),
      downloadXlsx: async () => {
        throw new Error('library failed');
      },
    };
    downloads.length = 0;
    excel?.click();
    await vi.waitFor(() => expect(downloads.some((name) => name.endsWith('.xls'))).toBe(true));
    expect(document.querySelector('[data-pdf-status]')?.textContent || '').toContain('запасной');
    HTMLAnchorElement.prototype.click = original;
    URL.createObjectURL = originalUrl;
    URL.revokeObjectURL = originalRevoke;
    globalThis.fetch = originalFetch;
    api.destroy();
  });
});
