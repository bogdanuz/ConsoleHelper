import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(dir, '../fixtures/backoffice-extra-rows.json'), 'utf8'),
) as {
  raw: string[][];
  smartExpectedRows: number;
  smartFirstId: string;
};

describe('backoffice extra-rows fixture', () => {
  it('smart normalize merges id rows', () => {
    const { rows, meta } = normalizeRows(fixture.raw, { mergeIdRows: true });
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(fixture.smartExpectedRows);
    expect(rows[0]![1]).toBe(fixture.smartFirstId);
  });

  it('raw path keeps doubled rows when smart off', () => {
    const { rows } = normalizeRows(fixture.raw, {
      mergeIdRows: false,
      splitMultilineName: false,
    });
    expect(rows).toHaveLength(fixture.raw.length);
  });
});
