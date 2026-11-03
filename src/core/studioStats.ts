import { parseRuNumber } from './parseRuNumber';

export function filterRowsByQuery(rows: string[][], query: string): string[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.map((r) => [...r]);
  return rows.filter((row) => row.some((c) => String(c).toLowerCase().includes(q)));
}

export function filterNonEmptyRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((c) => String(c).trim()));
}

export type CellRef = { r: number; c: number };

export function cellKey(ref: CellRef): string {
  return `${ref.r}:${ref.c}`;
}

export function sumSelectedCells(
  rows: string[][],
  selected: Iterable<string>,
): { count: number; sum: number; numericCount: number } {
  let count = 0;
  let sum = 0;
  let numericCount = 0;
  for (const key of selected) {
    count++;
    const [rs, cs] = key.split(':');
    const r = Number(rs);
    const c = Number(cs);
    const raw = rows[r]?.[c];
    if (raw == null) continue;
    const n = parseRuNumber(String(raw));
    if (n === null) continue;
    sum += n;
    numericCount++;
  }
  return { count, sum, numericCount };
}

/** After deleting row at deletedIndex, shift selection keys so sums stay on the same cells. */
export function remapSelectionAfterRowDelete(
  selected: Iterable<string>,
  deletedIndex: number,
): string[] {
  const next: string[] = [];
  for (const key of selected) {
    const [rs, cs] = key.split(':');
    const r = Number(rs);
    const c = Number(cs);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (r === deletedIndex) continue;
    if (r > deletedIndex) next.push(`${r - 1}:${c}`);
    else next.push(key);
  }
  return next;
}
