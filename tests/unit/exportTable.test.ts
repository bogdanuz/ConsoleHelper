import { describe, expect, it } from 'vitest';
import { toCsv, toExcelHtml, toTsv } from '../../src/core/exportTable';

describe('exportTable', () => {
  const rows = [
    ['A', 'B'],
    ['1', '2'],
  ];

  it('makes TSV', () => {
    expect(toTsv(rows)).toBe('A\tB\n1\t2');
  });

  it('makes CSV with quotes', () => {
    expect(toCsv([['a"b', 'c']])).toBe('"a""b";"c"');
  });

  it('makes Excel HTML with escaped cells', () => {
    const html = toExcelHtml([['<x>', 'y']]);
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('<table');
  });

  it('exports spaced numbers as real Excel numbers', () => {
    const html = toExcelHtml([['10 000', 'Name']]);
    expect(html).toContain('<td>10000</td>');
    expect(html).toContain("mso-number-format:'\\@'");
    expect(html).toContain('Name');
  });
});
