import { describe, expect, it } from 'vitest';
import { compactNumericCell, compactNumericGrid } from '../../src/core/compactNumbers';

describe('compactNumbers', () => {
  it('strips thousand spaces from numbers', () => {
    expect(compactNumericCell('10 000')).toBe('10000');
    expect(compactNumericCell('12 763,50')).toBe('12763.5');
    expect(compactNumericCell('1 018 207')).toBe('1018207');
  });

  it('leaves text and ids alone', () => {
    expect(compactNumericCell('Sample item')).toBe('Sample item');
    expect(compactNumericCell('ID-1001-A')).toBe('ID-1001-A');
    expect(compactNumericCell('')).toBe('');
  });

  it('counts changed cells in a grid', () => {
    const { rows, changed } = compactNumericGrid([
      ['Name', '10 000'],
      ['ID-1', '200'],
    ]);
    expect(changed).toBe(1);
    expect(rows[0]![1]).toBe('10000');
    expect(rows[1]![1]).toBe('200');
  });
});
