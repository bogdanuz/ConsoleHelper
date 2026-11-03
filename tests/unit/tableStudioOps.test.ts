import { describe, expect, it } from 'vitest';
import { deleteRow, padGrid, setCell } from '../../src/core/tableStudioOps';

describe('tableStudioOps', () => {
  it('edits a cell', () => {
    const rows = [
      ['a', 'b'],
      ['c', 'd'],
    ];
    expect(setCell(rows, 1, 0, 'x')).toEqual([
      ['a', 'b'],
      ['x', 'd'],
    ]);
    expect(rows[1]![0]).toBe('c');
  });

  it('deletes a row', () => {
    const rows = [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ];
    expect(deleteRow(rows, 1)).toEqual([
      ['a', 'b'],
      ['e', 'f'],
    ]);
  });

  it('pads jagged rows', () => {
    expect(padGrid([['a'], ['b', 'c']])).toEqual([
      ['a', ''],
      ['b', 'c'],
    ]);
  });
});
