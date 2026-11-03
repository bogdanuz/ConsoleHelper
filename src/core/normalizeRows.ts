import { isZeroish, looksLikeId, looksLikeTitle } from './parseRuNumber';
import type { NormalizeOptions, NormalizeResult } from './types';

const DEPT_RE = /\s*\(([^)]{1,32})\)\s*$/;

function nonEmptyCount(row: string[]): number {
  return row.filter((c) => c.trim()).length;
}

function idTokenFromRow(row: string[]): string {
  const cells = row.map((c) => c.trim());
  const first = cells[0] ?? '';
  if (looksLikeId(first)) return first;
  return cells.slice(1).find((c) => looksLikeId(c)) ?? '';
}

function pad(rows: string[][]): string[][] {
  const w = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => {
    const copy = [...r];
    while (copy.length < w) copy.push('');
    return copy;
  });
}

/**
 * name\\nid in one cell → put id into column 1 only if that cell is empty.
 * Never insert a column (that would shove CAPEX/OPEX under the wrong headers).
 */
function applySplitMultilineNames(rows: string[][]): { rows: string[][]; splitName: number } {
  let splitName = 0;
  const out = rows.map((row) => {
    const first = row[0] ?? '';
    const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return [...row];
    const name = parts[0] ?? '';
    const idPart = parts.slice(1).join(' ');
    // Only treat as name+id when the extra line looks like an id
    if (!looksLikeId(idPart)) return [...row];

    const second = String(row[1] ?? '').trim();
    if (!second) {
      splitName++;
      const next = [...row];
      next[0] = name;
      while (next.length < 2) next.push('');
      next[1] = idPart;
      return next;
    }
    // Column 1 already has data (budget etc.) — keep id with the name, no shift
    return row;
  });
  return { rows: out, splitName };
}

function extractDept(row: string[]): string[] {
  const first = row[0] ?? '';
  const m = first.match(DEPT_RE);
  if (!m) return row;
  const second = String(row[1] ?? '').trim();
  // Only add dept column when col1 is free — never shove metrics
  if (second) {
    const next = [...row];
    next[0] = first.replace(DEPT_RE, '').trim();
    return next;
  }
  const next = [...row];
  next[0] = first.replace(DEPT_RE, '').trim();
  while (next.length < 2) next.push('');
  next[1] = m[1] ?? '';
  return next;
}

/**
 * Turn visually broken grids into logical rows.
 * Rule: never insert columns in the middle — that misaligns header labels vs numbers.
 */
export function normalizeRows(
  input: string[][],
  options: NormalizeOptions = {},
): NormalizeResult {
  const {
    mergeIdRows = true,
    splitMultilineName = true,
    extractDept: doDept = false,
    dropEmpty = true,
    dropAllZeroMetrics = false,
  } = options;

  let merged = 0;
  let splitName = 0;
  let rows = input.map((r) => [...r]);

  if (splitMultilineName) {
    const applied = applySplitMultilineNames(rows);
    rows = applied.rows;
    splitName = applied.splitName;
  }

  if (mergeIdRows) {
    const out: string[][] = [];
    for (const row of rows) {
      const idToken = idTokenFromRow(row);
      const prev = out[out.length - 1];
      const continuation =
        prev &&
        looksLikeTitle(prev[0] ?? '') &&
        nonEmptyCount(row) <= 2 &&
        !!idToken &&
        !(prev[1] && looksLikeId(prev[1]));

      if (continuation && prev) {
        const second = String(prev[1] ?? '').trim();
        if (!second) {
          while (prev.length < 2) prev.push('');
          prev[1] = idToken;
        } else {
          // Metrics already in col1 — attach id to the name, do not shift columns
          prev[0] = `${prev[0] ?? ''}\n${idToken}`.trim();
        }
        for (let i = 0; i < row.length; i++) {
          const v = row[i]?.trim() ?? '';
          if (!v || v === idToken) continue;
          while (prev.length <= i) prev.push('');
          if (!String(prev[i] ?? '').trim()) prev[i] = v;
        }
        merged++;
      } else {
        out.push([...row]);
      }
    }
    rows = out;
  }

  if (doDept) {
    rows = rows.map(extractDept);
  }

  if (dropEmpty) {
    rows = rows.filter((r) => r.some((c) => c.trim()));
  }

  if (dropAllZeroMetrics) {
    rows = rows.filter((r) => {
      if (r.length <= 1) return r.some((c) => c.trim());
      const metrics = r.slice(1);
      return metrics.some((c) => c.trim() && !isZeroish(c));
    });
  }

  rows = pad(rows);

  return {
    rows,
    meta: {
      inputRows: input.length,
      outputRows: rows.length,
      merged,
      splitName,
    },
  };
}
