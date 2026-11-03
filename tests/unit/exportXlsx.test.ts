import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildXlsxArrayBuffer, gridToAoa } from '../../src/core/exportXlsx';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

describe('exportXlsx', () => {
  it('converts spaced numbers to numeric aoa', () => {
    expect(gridToAoa([['10 000', 'Name']])).toEqual([[10000, 'Name']]);
  });

  it('builds xlsx buffer via sheetjs', () => {
    const XLSX = require(join(root, 'node_modules/xlsx'));
    const buf = buildXlsxArrayBuffer(XLSX, [
      ['Name', 'Amt'],
      ['A', '10 000'],
    ]);
    expect(buf.byteLength).toBeGreaterThan(100);
  });

  it('ships vendor file', () => {
    const size = readFileSync(join(root, 'public/vendor/xlsx.full.min.js')).byteLength;
    expect(size).toBeGreaterThan(10_000);
  });
});
