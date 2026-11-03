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

function splitFirstCell(row: string[]): { row: string[]; split: boolean } {
  const first = row[0] ?? '';
  const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { row, split: false };
  const [name, id, ...rest] = parts;
  const next = [...row];
  next[0] = name ?? '';
  next.splice(1, 0, [id, ...rest].join(' '));
  return { row: next, split: true };
}

function extractDept(row: string[]): string[] {
  const first = row[0] ?? '';
  const m = first.match(DEPT_RE);
  if (!m) return row;
  const next = [...row];
  next[0] = first.replace(DEPT_RE, '').trim();
  next.splice(1, 0, m[1] ?? '');
  return next;
}

/**
 * Turn visually broken grids into logical rows.
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
    rows = rows.map((r) => {
      const { row, split } = splitFirstCell(r);
      if (split) splitName++;
      return row;
    });
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
        const name = prev[0] ?? '';
        const rest = prev.slice(1);
        const alreadyHasId = !!(rest[0] && looksLikeId(rest[0]));
        if (alreadyHasId) {
          prev[0] = `${name}\n${idToken}`.trim();
        } else {
          prev.length = 0;
          prev.push(name, idToken, ...rest);
        }
        for (let i = 0; i < row.length; i++) {
          const v = row[i]?.trim() ?? '';
          if (!v || v === idToken) continue;
          const target = i === 0 ? 2 : i + 1;
          while (prev.length <= target) prev.push('');
          prev[target] = (prev[target] ? `${prev[target]} ` : '') + v;
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
