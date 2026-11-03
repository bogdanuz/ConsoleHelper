import { describe, expect, it } from 'vitest';
import { buildGrid, colsN } from '../../src/core/buildGrid';
import type { Fragment } from '../../src/core/types';

function frag(t: string, x1: number, x2: number, y: number, h = 14): Fragment {
  return { t, x1, x2, y, h };
}

describe('buildGrid', () => {
  it('builds two columns from spatially separated words', () => {
    const frags = [
      frag('Name', 0, 40, 10),
      frag('Budget', 200, 260, 10),
      frag('Alpha', 0, 40, 40),
      frag('100', 200, 230, 40),
      frag('Beta', 0, 35, 70),
      frag('200', 200, 230, 70),
    ];
    const grid = buildGrid(frags, 6, 14);
    expect(colsN(grid)).toBeGreaterThanOrEqual(2);
    expect(grid.length).toBe(3);
    expect(grid[1]!.join(' ')).toContain('Alpha');
    expect(grid[1]!.join(' ')).toContain('100');
  });

  it('returns empty for no fragments', () => {
    expect(buildGrid([])).toEqual([]);
  });
});
