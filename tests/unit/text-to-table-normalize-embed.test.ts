/**
 * Ensures embedded normalize in public tool stays aligned with core behavior.
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('text-to-table embedded normalize', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { __tx?: unknown }).__tx;
  });

  it('exposes _test.normalizeRows matching core on fixture', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    // eslint-disable-next-line no-eval
    (0, eval)(code);
    const api = (window as unknown as { __tx: { _test: { normalizeRows: typeof normalizeRows } } })
      .__tx._test;
    expect(api?.normalizeRows).toBeTypeOf('function');

    const raw = [
      ['Sample catalog item Alpha', '12763,50', '1000', '0'],
      ['ID-1001-A', '', '', ''],
    ];
    const core = normalizeRows(raw).rows;
    const embedded = (api.normalizeRows as typeof normalizeRows)(raw).rows;
    expect(embedded).toEqual(core);
    (window as unknown as { __tx: { destroy: () => void } }).__tx.destroy();
  });

  it('ships smart toggle label in source', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    expect(code).toContain('Умная таблица: ВКЛ');
    expect(code).toContain('smart = true');
  });
});
