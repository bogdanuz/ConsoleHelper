import { describe, expect, it } from 'vitest';
import { normalizeRows } from '../../src/core/normalizeRows';

describe('normalizeRows', () => {
  it('merges extra id row under title without shifting metrics', () => {
    const input = [
      ['Sample catalog item Alpha', '12763,50', '1000', '0'],
      ['ID-1001-A', '', '', ''],
      ['Sample catalog item Beta', '5000,00', '0', '0'],
      ['ID-1001-B', '', '', ''],
    ];
    const { rows, meta } = normalizeRows(input, { mergeIdRows: true });
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(2);
    // id stays with the name — numbers stay in the same columns
    expect(rows[0]![0]).toBe('Sample catalog item Alpha\nID-1001-A');
    expect(rows[0]![1]).toBe('12763,50');
    expect(rows[0]![2]).toBe('1000');
    expect(rows[1]![0]).toBe('Sample catalog item Beta\nID-1001-B');
    expect(rows[1]![1]).toBe('5000,00');
  });

  it('puts id into empty second cell when free', () => {
    const input = [
      ['Sample catalog item Alpha', '', '1000'],
      ['ID-1001-A', '', ''],
    ];
    const { rows, meta } = normalizeRows(input, {
      mergeIdRows: true,
      splitMultilineName: false,
    });
    expect(meta.merged).toBe(1);
    expect(rows[0]![0]).toBe('Sample catalog item Alpha');
    expect(rows[0]![1]).toBe('ID-1001-A');
    expect(rows[0]![2]).toBe('1000');
  });

  it('splits multiline name\\nid into empty col1 only', () => {
    const input = [['Sample item\nID-1001-A', '', '100']];
    const { rows, meta } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: true,
    });
    expect(meta.splitName).toBe(1);
    expect(rows[0]![0]).toBe('Sample item');
    expect(rows[0]![1]).toBe('ID-1001-A');
    expect(rows[0]![2]).toBe('100');
  });

  it('does not shift CAPEX/OPEX when col1 already has a number', () => {
    const input = [
      ['Sample item\nID-1001-A', '100', '200'],
      ['Other item', '50', '75'],
    ];
    const { rows, meta } = normalizeRows(input, {
      mergeIdRows: false,
      splitMultilineName: true,
    });
    expect(meta.splitName).toBe(0);
    expect(rows[0]![0]).toContain('Sample item');
    expect(rows[0]![1]).toBe('100');
    expect(rows[0]![2]).toBe('200');
    expect(rows[1]![1]).toBe('50');
  });

  it('extracts department suffix into empty col1', () => {
    const input = [['Demo project (TEAM)', '']];
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

  it('merges uuid and letter+digit codes under titles without shifting', () => {
    const input = [
      ['Sample catalog item Alpha', '100', '0'],
      ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', '', ''],
      ['Sample catalog item Beta', '200', '0'],
      ['', 'ITEM2048', ''],
    ];
    const { rows, meta } = normalizeRows(input);
    expect(meta.merged).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]![0]).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(rows[0]![1]).toBe('100');
    expect(rows[1]![0]).toContain('ITEM2048');
    expect(rows[1]![1]).toBe('200');
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
