export function toTsv(rows: string[][]): string {
  return rows.map((r) => r.join('\t')).join('\n');
}

export function toCsv(rows: string[][], sep = ';'): string {
  return rows
    .map((r) =>
      r
        .map((c) => `"${c.replace(/"/g, '""')}"`)
        .join(sep),
    )
    .join('\n');
}

export function toExcelHtml(rows: string[][]): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = rows
    .map(
      (r) =>
        '<tr>' +
        r
          .map(
            (c) =>
              `<td style="mso-number-format:'\\@'">${esc(c)}</td>`,
          )
          .join('') +
        '</tr>',
    )
    .join('');
  return `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`;
}
