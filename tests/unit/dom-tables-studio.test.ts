/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('dom-tables → studio', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { __tp?: unknown }).__tp;
    delete (window as unknown as { __CH_Studio?: unknown }).__CH_Studio;
  });

  it('ships studio load + smart toggle', () => {
    const code = readFileSync(join(root, 'public/tools/dom-tables.js'), 'utf8');
    expect(code).toContain('table-studio.js');
    expect(code).toContain('__CH_Studio');
    expect(code).toContain('Умная таблица: ВКЛ');
    expect(code).toContain('Открыть в редакторе');
  });

  it('embedded normalize matches core on id variants', () => {
    const code = readFileSync(join(root, 'public/tools/dom-tables.js'), 'utf8');
    (0, eval)(code);
    const api = (
      window as unknown as {
        __tp: { _test: { normalizeRows: typeof normalizeRows }; destroy: () => void };
      }
    ).__tp;
    const raw = [
      ['Sample catalog item Alpha', '100', '0'],
      ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', '', ''],
    ];
    expect(api._test.normalizeRows(raw).rows).toEqual(normalizeRows(raw).rows);
    api.destroy();
  });
});
