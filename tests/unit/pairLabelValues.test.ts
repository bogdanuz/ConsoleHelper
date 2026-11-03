import { describe, expect, it } from 'vitest';
import { pairLabelValues } from '../../src/core/pairLabelValues';
import type { Fragment } from '../../src/core/types';

const f = (t: string, x1: number, x2: number, y: number): Fragment => ({
  t,
  x1,
  x2,
  y,
  h: 14,
});

describe('pairLabelValues', () => {
  it('turns stacked label-over-number cards into label | value rows', () => {
    const frags: Fragment[] = [
      f('Budget', 10, 90, 40),
      f('966', 10, 40, 62),
      f('256,54', 44, 90, 62),
      f('CAPEX', 10, 50, 90),
      f('858', 10, 40, 112),
      f('474', 44, 70, 112),
      f('OPEX', 100, 150, 90),
      f('107', 100, 130, 112),
      f('782', 134, 170, 112),
    ];
    const { use, rows } = pairLabelValues(frags, 8);
    expect(use).toBe(true);
    expect(rows).toEqual([
      ['Budget', '966 256,54'],
      ['CAPEX', '858 474'],
      ['OPEX', '107 782'],
    ]);
  });

  it('does not flatten a normal table where text and numbers share a line', () => {
    const frags: Fragment[] = [
      f('Alpha', 10, 80, 20),
      f('10', 100, 130, 20),
      f('20', 150, 180, 20),
      f('Beta', 10, 80, 44),
      f('30', 100, 130, 44),
      f('40', 150, 180, 44),
      f('Gamma', 10, 80, 68),
      f('50', 100, 130, 68),
      f('60', 150, 180, 68),
    ];
    const { use } = pairLabelValues(frags);
    expect(use).toBe(false);
  });
});
