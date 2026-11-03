import { parseRuNumber } from './parseRuNumber';

export function toTsv(rows: string[][]): string {
  return rows.map((r) => r.join('\t')).join('\n');
}

export function toCsv(rows: string[][], sep = ';'): string {
  return rows
    .map((r) =>
      r
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(sep),
    )
    .join('\n');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Excel HTML: real numbers without thousand spaces (no text format \@).
 * Text cells stay as text so leading zeros / ids are safe.
 */
export function toExcelHtml(rows: string[][]): string {
  const body = rows
    .map(
      (r) =>
        '<tr>' +
        r
          .map((c) => {
            const n = parseRuNumber(c);
            if (n !== null) {
              return `<td>${n}</td>`;
            }
            return `<td style="mso-number-format:'\\@'">${escHtml(String(c))}</td>`;
          })
          .join('') +
        '</tr>',
    )
    .join('');
  return `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
}
