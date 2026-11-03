import { parseRuNumber } from './parseRuNumber';

/**
 * If the whole cell is a number like "10 000" / "12 763,50",
 * return a compact form Excel can treat as a number (no thousand spaces).
 * Non-numeric cells are left unchanged.
 */
export function compactNumericCell(raw: string): string {
  const n = parseRuNumber(raw);
  if (n === null) return raw;
  if (Number.isInteger(n)) return String(n);
  // Trim floating noise from binary float (e.g. 12.763500000000001)
  const s = String(n);
  if (!s.includes('e') && !s.includes('E')) return s;
  return n.toFixed(10).replace(/\.?0+$/, '');
}

export function compactNumericGrid(rows: string[][]): {
  rows: string[][];
  changed: number;
} {
  let changed = 0;
  const next = rows.map((row) =>
    row.map((cell) => {
      const c = compactNumericCell(cell);
      if (c !== cell) changed++;
      return c;
    }),
  );
  return { rows: next, changed };
}
