import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseClipboard,
  parseDelimited,
  parseHtmlTable,
  splitDelimitedLine,
} from '../../src/core/parseClipboard';

const dir = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) => readFileSync(join(dir, '../fixtures', name), 'utf8');

describe('parseClipboard', () => {
  it('splits quoted csv cells', () => {
    expect(splitDelimitedLine('"a";"b;c";"d""e"', ';')).toEqual(['a', 'b;c', 'd"e']);
  });

  it('parses TSV fixture', () => {
    const { rows, format } = parseClipboard({ text: fx('sample-clipboard-tsv.txt') });
    expect(format).toBe('tsv');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['Name', 'Id', 'Amount']);
    expect(rows[1]![1]).toBe('ID-1001-A');
  });

  it('parses CSV fixture with semicolon', () => {
    const { rows, format } = parseClipboard({ text: fx('sample-clipboard-csv.csv') });
    expect(format).toBe('csv');
    expect(rows).toHaveLength(3);
    expect(rows[1]![2]).toBe('1 000,50');
  });

  it('parses HTML table fixture', () => {
    const html = fx('sample-clipboard-table.html');
    expect(parseHtmlTable(html)[1]![0]).toBe('Sample item Alpha');
    const { rows, format } = parseClipboard({ html, text: 'fallback' });
    expect(format).toBe('html');
    expect(rows).toHaveLength(3);
  });

  it('prefers HTML over plain text when both present', () => {
    const { format, rows } = parseClipboard({
      html: '<table><tr><td>H1</td><td>H2</td></tr></table>',
      text: 'A\tB\nC\tD',
    });
    expect(format).toBe('html');
    expect(rows[0]).toEqual(['H1', 'H2']);
  });

  it('returns empty for blank input', () => {
    expect(parseClipboard({}).format).toBe('empty');
    expect(parseDelimited('a;b\nc;d', ';')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});
