import { describe, expect, it } from 'vitest';
import {
  isZeroish,
  looksLikeId,
  looksLikeTitle,
  parseRuNumber,
} from '../../src/core/parseRuNumber';

describe('parseRuNumber', () => {
  it('parses spaced thousands and comma decimals', () => {
    expect(parseRuNumber('12 763,50')).toBe(12763.5);
    expect(parseRuNumber('1 018 207')).toBe(1018207);
  });

  it('handles currency and dashes', () => {
    expect(parseRuNumber('669,96 ₽')).toBe(669.96);
    expect(parseRuNumber('—')).toBeNull();
    expect(parseRuNumber('')).toBeNull();
  });

  it('keeps percents out of plain numbers', () => {
    expect(parseRuNumber('74%')).toBeNull();
    expect(parseRuNumber('10 000')).toBe(10000);
  });

  it('detects zeroish cells', () => {
    expect(isZeroish('0')).toBe(true);
    expect(isZeroish('—')).toBe(true);
    expect(isZeroish('12,5')).toBe(false);
  });

  it('detects code-like ids', () => {
    expect(looksLikeId('ID-1001-A')).toBe(true);
    expect(looksLikeId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    expect(looksLikeId('ITEM2048')).toBe(true);
    expect(looksLikeId('Sample catalog item with a long title')).toBe(false);
    expect(looksLikeId('12763,50')).toBe(false);
  });

  it('detects title-like cells', () => {
    expect(looksLikeTitle('Sample catalog item')).toBe(true);
    expect(looksLikeTitle('ID-1001-A')).toBe(false);
    expect(looksLikeTitle('100')).toBe(false);
  });
});
