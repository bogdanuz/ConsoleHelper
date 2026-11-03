import type { Fragment } from './types';

/**
 * Spatial fragments → string grid (port of concept tx.build).
 */
export function buildGrid(
  frags: Fragment[],
  merge = 6,
  gap = 14,
): string[][] {
  if (!frags.length) return [];

  const hs = frags.map((f) => f.h).sort((a, b) => a - b);
  const tol = hs[Math.floor(hs.length / 2)]! * 0.6;
  const sorted = [...frags].sort((a, b) => a.y - b.y);
  const rows: { y: number; items: Fragment[] }[] = [];

  for (const f of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(f.y - last.y) <= tol) {
      last.items.push(f);
      last.y = (last.y * (last.items.length - 1) + f.y) / last.items.length;
    } else {
      rows.push({ y: f.y, items: [f] });
    }
  }

  for (const r of rows) {
    r.items.sort((a, b) => a.x1 - b.x1);
    const merged: Fragment[] = [];
    for (const it of r.items) {
      const prev = merged[merged.length - 1];
      if (prev && it.x1 - prev.x2 <= merge) {
        prev.t += ' ' + it.t;
        prev.x2 = Math.max(prev.x2, it.x2);
      } else {
        merged.push({ ...it });
      }
    }
    r.items = merged;
  }

  const all = rows.flatMap((r) => r.items);
  const minX = Math.floor(Math.min(...all.map((i) => i.x1)));
  const maxX = Math.ceil(Math.max(...all.map((i) => i.x2)));
  const W = Math.max(1, maxX - minX);
  const diff = new Int32Array(W + 3);

  for (const i of all.filter((x) => x.x2 - x.x1 <= 0.6 * W)) {
    diff[Math.max(0, Math.floor(i.x1 - minX))]!++;
    diff[Math.min(W + 1, Math.ceil(i.x2 - minX) + 1)]!--;
  }

  const thr = Math.floor(rows.length * 0.05);
  const cuts: number[] = [];
  let c = 0;
  let runStart = -1;
  for (let x = 0; x <= W; x++) {
    c += diff[x]!;
    if (c <= thr) {
      if (runStart < 0) runStart = x;
    } else if (runStart >= 0) {
      if (runStart > 0 && x - runStart >= gap) {
        cuts.push(minX + (runStart + x) / 2);
      }
      runStart = -1;
    }
  }

  const colOf = (it: Fragment) => {
    const x = it.x2 - it.x1 > 0.6 * W ? it.x1 : (it.x1 + it.x2) / 2;
    let k = 0;
    while (k < cuts.length && cuts[k]! < x) k++;
    return k;
  };

  const N = cuts.length + 1;
  return rows
    .map((r) => {
      const cells = Array<string>(N).fill('');
      for (const it of r.items) {
        const k = colOf(it);
        cells[k] = cells[k] ? `${cells[k]} ${it.t}` : it.t;
      }
      return cells;
    })
    .filter((r) => r.some((cell) => cell));
}

export function colsN(grid: string[][]): number {
  return grid.length ? Math.max(...grid.map((r) => r.length)) : 0;
}
