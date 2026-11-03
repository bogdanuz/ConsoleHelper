import { describe, expect, it } from 'vitest';
import {
  filterNonEmptyRows,
  filterRowsByQuery,
  remapSelectionAfterRowDelete,
  sumSelectedCells,
} from '../../src/core/studioStats';

describe('studioStats', () => {
  const rows = [
    ['A', '10 000'],
    ['B', '5 000'],
    ['', ''],
    ['C', 'x'],
  ];

  it('filters by query', () => {
    expect(filterRowsByQuery(rows, 'a')).toHaveLength(1);
    expect(filterRowsByQuery(rows, '')).toHaveLength(4);
  });

  it('filters non-empty', () => {
    expect(filterNonEmptyRows(rows)).toHaveLength(3);
  });

  it('sums selected numeric cells', () => {
    const { count, sum, numericCount } = sumSelectedCells(rows, ['0:1', '1:1']);
    expect(count).toBe(2);
    expect(numericCount).toBe(2);
    expect(sum).toBe(15000);
  });

  it('remaps selection after deleting an earlier row', () => {
    expect(remapSelectionAfterRowDelete(['2:0', '0:1'], 0)).toEqual(['1:0']);
    expect(remapSelectionAfterRowDelete(['1:0'], 1)).toEqual([]);
  });
});
