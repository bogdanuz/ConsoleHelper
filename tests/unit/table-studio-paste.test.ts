/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseClipboard } from '../../src/core/parseClipboard';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('table-studio paste', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="box"></div>';
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('exposes parseClipboard matching core', () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (
      window as unknown as {
        __CH_Studio: { parseClipboard: typeof parseClipboard; mount: Function };
      }
    ).__CH_Studio;
    const text = readFileSync(join(root, 'tests/fixtures/sample-clipboard-tsv.txt'), 'utf8');
    expect(Studio.parseClipboard({ text })).toEqual(parseClipboard({ text }));
  });

  it('mount shows paste button', () => {
    const code = readFileSync(join(root, 'public/tools/table-studio.js'), 'utf8');
    (0, eval)(code);
    const Studio = (window as unknown as { __CH_Studio: { mount: Function } }).__CH_Studio;
    const box = document.getElementById('box')!;
    const api = Studio.mount(box, { rows: [['a', 'b']] }) as {
      destroy: () => void;
      pasteFromClipboard: () => Promise<boolean>;
    };
    expect(box.textContent).toContain('Вставить');
    expect(api.pasteFromClipboard).toBeTypeOf('function');
    api.destroy();
  });

  it('text-to-table still loads studio for in-page edit', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    expect(code).toContain('table-studio.js');
    expect(code).toContain('__CH_Studio');
  });
});
