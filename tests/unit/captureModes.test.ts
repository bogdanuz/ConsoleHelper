import { describe, expect, it } from 'vitest';
import { applyCaptureModes, suggestHeaderRow } from '../../src/core/captureModes';
import type { Fragment } from '../../src/core/types';

const f = (t: string, x1: number, x2: number, y: number): Fragment => ({
  t,
  x1,
  x2,
  y,
  h: 14,
});

describe('applyCaptureModes', () => {
  const table = [
    ['Sample catalog item Alpha', '12763,50', '1000'],
    ['ID-1001-A', '', ''],
  ];

  it('leaves the grid unchanged when both extras are off', () => {
    const { rows, note } = applyCaptureModes({ rows: table });
    expect(rows).toEqual(table);
    expect(note).toBe('');
  });

  it('adds a code column only when that mode is on', () => {
    const { rows } = applyCaptureModes({ rows: table, codeColumn: true });
    expect(rows[0]![1]).toBe('ID-1001-A');
    expect(rows[0]![2]).toBe('12763,50');
  });

  it('keeps the table when labels-over-numbers does not match', () => {
    const { rows, note } = applyCaptureModes({
      rows: table,
      frags: [f('Alpha', 0, 40, 10), f('1', 50, 70, 10)],
      labelValues: true,
    });
    expect(note).toBe('не похоже на подписи над числами');
    expect(rows).toEqual(table);
  });

  it('can apply labels and then the code column without replacing each other', () => {
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
    const { rows, note } = applyCaptureModes({
      rows: [['ignored']],
      frags,
      labelValues: true,
      codeColumn: true,
    });
    expect(note).toBe('');
    expect(rows[0]).toEqual(['Budget', '966 256,54']);
  });
});

describe('suggestHeaderRow', () => {
  it('hints when the first row looks like titles and the next has numbers', () => {
    expect(
      suggestHeaderRow([
        ['Name', 'Budget'],
        ['Alpha', '100'],
      ]),
    ).toBe(true);
    expect(
      suggestHeaderRow([
        ['Alpha', '100'],
        ['Beta', '200'],
      ]),
    ).toBe(false);
  });
});
