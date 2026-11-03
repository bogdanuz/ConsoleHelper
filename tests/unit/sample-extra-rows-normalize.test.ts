import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(dir, '../fixtures/sample-extra-rows.json'), 'utf8'),
) as {
  raw: string[][];
  smartExpectedRows: number;
  smartFirstId: string;
};

describe('sample extra-rows fixture', () => {
  it('smart normalize puts the id in a new column beside the name', () => {
    const { rows, meta } = normalizeRows(fixture.raw, { mergeIdRows: true });
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(fixture.smartExpectedRows);
    expect(rows[0]![1]).toBe(fixture.smartFirstId);
    expect(rows[0]![2]).toBe('12763,50');
  });

  it('raw path keeps doubled rows when smart off', () => {
    const { rows } = normalizeRows(fixture.raw, {
      mergeIdRows: false,
      splitMultilineName: false,
    });
    expect(rows).toHaveLength(fixture.raw.length);
  });
});
