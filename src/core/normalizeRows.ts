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

/** New column at index 1 for every row, so headers and numbers move together. */
function insertIdColumn(rows: string[][], ids: string[]): string[][] {
  return rows.map((row, i) => {
    const next = [...row];
    next.splice(1, 0, ids[i] ?? '');
    return next;
  });
}

/**
 * name\\nid in one cell → remember the id.
 * A later pass always inserts one new column for every row.
 */
function applySplitMultilineNames(rows: string[][]): {
  rows: string[][];
  pending: string[];
  splitName: number;
} {
  let splitName = 0;
  const pending = rows.map(() => '');
  const out = rows.map((row, i) => {
    const first = row[0] ?? '';
    const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return [...row];
    const name = parts[0] ?? '';
    const idPart = parts.slice(1).join(' ');
    if (!looksLikeId(idPart)) return [...row];

    const next = [...row];
    next[0] = name;
    splitName++;
    pending[i] = idPart;
    return next;
  });
  return { rows: out, pending, splitName };
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
 * An id that does not fit beside the title becomes a new column for every row.
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
  let pending = rows.map(() => '');

  if (splitMultilineName) {
    const applied = applySplitMultilineNames(rows);
    rows = applied.rows;
    pending = applied.pending;
    splitName = applied.splitName;
  }

  if (mergeIdRows) {
    const out: string[][] = [];
    const outPending: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const idToken = idTokenFromRow(row);
      const prev = out[out.length - 1];
      const continuation =
        prev &&
        looksLikeTitle(prev[0] ?? '') &&
        nonEmptyCount(row) <= 2 &&
        !!idToken &&
        !(prev[1] && looksLikeId(prev[1])) &&
        !outPending[out.length - 1];

      if (continuation && prev) {
        outPending[out.length - 1] = idToken;
        for (let c = 0; c < row.length; c++) {
          const v = row[c]?.trim() ?? '';
          if (!v || v === idToken) continue;
          while (prev.length <= c) prev.push('');
          if (!String(prev[c] ?? '').trim()) prev[c] = v;
        }
        merged++;
      } else {
        out.push([...row]);
        outPending.push(pending[i] ?? '');
      }
    }
    rows = out;
    pending = outPending;
  }

  if (pending.some((id) => id)) {
    rows = insertIdColumn(rows, pending);
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
