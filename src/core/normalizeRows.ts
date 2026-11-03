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
 * If any first cell has name\\nid lines, pull id into its own column for ALL rows
 * so numbers stay under the same column index (do not shove metrics sideways only on some rows).
 */
function applySplitMultilineNames(rows: string[][]): { rows: string[][]; splitName: number } {
  const parsed = rows.map((row) => {
    const first = row[0] ?? '';
    const parts = first.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return { split: false as const, row: [...row] };
    const [name, ...restParts] = parts;
    return {
      split: true as const,
      row: [name ?? '', restParts.join(' '), ...row.slice(1)],
    };
  });
  if (!parsed.some((p) => p.split)) return { rows, splitName: 0 };

  let splitName = 0;
  const out = parsed.map((p) => {
    if (p.split) {
      splitName++;
      return p.row;
    }
    const r = p.row;
    // Already has an id-like 2nd cell — keep columns as-is.
    if (r.length >= 2 && looksLikeId(String(r[1] ?? ''))) return r;
    // Id-only first cell — no title to split.
    if (looksLikeId(String(r[0] ?? '')) && !looksLikeTitle(String(r[0] ?? ''))) return r;
    // Insert empty id column so metrics align with split rows.
    return [r[0] ?? '', '', ...r.slice(1)];
  });
  return { rows: out, splitName };
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
