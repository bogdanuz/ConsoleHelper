import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(dir, '../fixtures/sample-id-variants.json'), 'utf8'),
) as {
  raw: string[][];
  smartExpectedRows: number;
  smartIds: string[];
};

describe('sample id-variants fixture', () => {
  it('merges uuid / shifted / letter+digit id rows', () => {
    const { rows, meta } = normalizeRows(fixture.raw);
    expect(meta.merged).toBe(3);
    expect(rows).toHaveLength(fixture.smartExpectedRows);
    expect(rows.map((r) => r[1])).toEqual(fixture.smartIds);
  });
});
