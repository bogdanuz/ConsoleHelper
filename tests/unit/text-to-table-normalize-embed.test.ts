/**
 * Ensures embedded normalize in public tool stays aligned with core behavior.
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';
import { pairLabelValues } from '../../src/core/pairLabelValues';
import type { Fragment } from '../../src/core/types';

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
    expect(code).toContain("pos === 'sticky'");
    expect(code).toContain("pos === 'fixed'");
  });

  it('embedded pairLabelValues matches core on a card fixture', () => {
    const code = readFileSync(join(root, 'public/tools/text-to-table.js'), 'utf8');
    (0, eval)(code);
    const api = (
      window as unknown as {
        __tx: { _test: { pairLabelValues: typeof pairLabelValues }; destroy: () => void };
      }
    ).__tx;
    const frags: Fragment[] = [
      { t: 'Budget', x1: 10, x2: 90, y: 40, h: 14 },
      { t: '966', x1: 10, x2: 40, y: 62, h: 14 },
      { t: '256,54', x1: 44, x2: 90, y: 62, h: 14 },
      { t: 'CAPEX', x1: 10, x2: 50, y: 90, h: 14 },
      { t: '858', x1: 10, x2: 40, y: 112, h: 14 },
      { t: '474', x1: 44, x2: 70, y: 112, h: 14 },
      { t: 'OPEX', x1: 100, x2: 150, y: 90, h: 14 },
      { t: '107', x1: 100, x2: 130, y: 112, h: 14 },
      { t: '782', x1: 134, x2: 170, y: 112, h: 14 },
    ];
    expect(api._test.pairLabelValues(frags, 8).rows).toEqual(pairLabelValues(frags, 8).rows);
    api.destroy();
  });
});
