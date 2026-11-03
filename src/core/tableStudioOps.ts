/** Pure grid ops for Table Studio (testable without DOM). */

export function cloneGrid(rows: string[][]): string[][] {
  return rows.map((r) => [...r]);
}

export function setCell(
  rows: string[][],
  rowIndex: number,
  colIndex: number,
  value: string,
): string[][] {
  const next = cloneGrid(rows);
  const row = next[rowIndex];
  if (!row) return next;
  while (row.length <= colIndex) row.push('');
  row[colIndex] = value;
  return next;
}

export function deleteRow(rows: string[][], rowIndex: number): string[][] {
  if (rowIndex < 0 || rowIndex >= rows.length) return cloneGrid(rows);
  return rows.filter((_, i) => i !== rowIndex);
}

export function padGrid(rows: string[][]): string[][] {
  const w = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => {
    const copy = [...r];
    while (copy.length < w) copy.push('');
    return copy;
  });
}
