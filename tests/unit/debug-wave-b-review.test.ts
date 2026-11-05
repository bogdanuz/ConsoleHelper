/**
 * @vitest-environment jsdom
 * Runtime repro for Wave B review hypotheses (debug session 118115).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('debug wave-b review', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
    delete (window as unknown as { __CH_BASE__?: string }).__CH_BASE__;
    delete (window as unknown as { __CH_BUNDLE__?: unknown }).__CH_BUNDLE__;
  });

  it('H1 post-fix: click then dblclick edits the live cell', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    Studio.mount(box, {
      rows: [
        ['100', '200'],
        ['300', '400'],
      ],
    });

    const cell = box.querySelectorAll('tr')[1]!.querySelectorAll('td')[1] as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const live = box.querySelectorAll('tr')[1]!.querySelectorAll('td')[1] as HTMLElement;
    const liveEditable = live.getAttribute('contenteditable') === 'true';
    expect(liveEditable).toBe(true);
    expect(live).toBe(cell);
  });

  it('H2 post-fix: delete earlier row keeps sum on same cell', async () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    Studio.mount(box, {
      rows: [
        ['10', 'a'],
        ['20', 'b'],
        ['30', 'c'],
      ],
    });

    const row2 = box.querySelectorAll('tr')[3]!;
    const cell = row2.querySelectorAll('td')[1] as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const delBtn = box.querySelectorAll('tr')[1]!.querySelector('button') as HTMLButtonElement;
    delBtn.click();

    const sumAfter =
      [...box.querySelectorAll('div')].map((d) => d.textContent).find((t) => /Сумма:\s*30/.test(t || '')) ??
      '';
    expect(sumAfter).toMatch(/Сумма:\s*30/);
  });

  it('H3 post-fix: fat bookmark presets __CH_BASE__ to Pages', async () => {
    const fat = readFileSync(join(root, 'public/fat-bookmarklet.txt'), 'utf8');
    const m = fat.match(/atob\("([^"]+)"\)/);
    expect(m).toBeTruthy();
    const payload = Buffer.from(m![1]!, 'base64').toString('utf8');
    const presetsBase = payload.includes('https://bogdanuz.github.io/ConsoleHelper/tools/');
    expect(presetsBase).toBe(true);
  });

  it('H4 post-fix: menu uses textContent not innerHTML', async () => {
    const code = readFileSync(join(root, 'public/tools/launcher.js'), 'utf8');
    const usesInnerHtml = /b\.innerHTML\s*=/.test(code);
    const usesTextContent = code.includes('titleEl.textContent') && code.includes('hintEl.textContent');
    expect(usesInnerHtml).toBe(false);
    expect(usesTextContent).toBe(true);
  });
});
