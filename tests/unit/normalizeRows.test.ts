import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

describe('normalizeRows', () => {
  it('merges extra id row under title', () => {
    const input = [
      ['Sample catalog item Alpha', '12763,50', '1000', '0'],
      ['ID-1001-A', '', '', ''],
      ['Sample catalog item Beta', '5000,00', '0', '0'],
      ['ID-1001-B', '', '', ''],
    ];
    const { rows, meta } = normalizeRows(input, { mergeIdRows: true });
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]![0]).toBe('Sample catalog item Alpha');
    expect(rows[0]![1]).toBe('ID-1001-A');
    expect(rows[1]![1]).toBe('ID-1001-B');
  });

  it('splits multiline name\\nid inside one cell', () => {
    const input = [['Sample item\nID-1001-A', '100', '0']];
    const { rows, meta } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: true,
    });
    expect(meta.splitName).toBe(1);
    expect(rows[0]![0]).toBe('Sample item');
    expect(rows[0]![1]).toBe('ID-1001-A');
  });

  it('adds id column for all rows so metrics stay aligned', () => {
    const input = [
      ['Sample item\nID-1001-A', '100', '200'],
      ['Other item', '50', '75'],
    ];
    const { rows, meta } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: true,
    });
    expect(meta.splitName).toBe(1);
    expect(rows[0]).toEqual(['Sample item', 'ID-1001-A', '100', '200']);
    // empty id slot — numbers stay in same columns as the split row
    expect(rows[1]).toEqual(['Other item', '', '50', '75']);
  });

  it('extracts department suffix', () => {
    const input = [['Demo project (TEAM)', '10']];
    const { rows } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: false,
      extractDept: true,
    });
    expect(rows[0]![0]).toBe('Demo project');
    expect(rows[0]![1]).toBe('TEAM');
  });

  it('drops all-zero metric rows when asked', () => {
    const input = [
      ['Alive', '10', '0'],
      ['Empty', '0', '—'],
    ];
    const { rows } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: false,
      dropAllZeroMetrics: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]![0]).toBe('Alive');
  });

  it('merges uuid and letter+digit codes under titles', () => {
    const input = [
      ['Sample catalog item Alpha', '100', '0'],
      ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', '', ''],
      ['Sample catalog item Beta', '200', '0'],
      ['', 'ITEM2048', ''],
    ];
    const { rows, meta } = normalizeRows(input);
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]![1]).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(rows[1]![1]).toBe('ITEM2048');
  });

  it('does not merge id into another id-only row', () => {
    const input = [
      ['ID-1001-A', '', ''],
      ['ID-1001-B', '', ''],
    ];
    const { rows, meta } = normalizeRows(input);
    expect(meta.merged).toBe(0);
    expect(rows).toHaveLength(2);
  });
});
