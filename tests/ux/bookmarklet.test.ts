import { describe, expect, it } from 'vitest';
import { buildBookmarkletReadable } from '../../src/ui/bookmarklet';

describe('bookmarklet', () => {
  it('builds javascript bookmark that loads launcher', () => {
    const b = buildBookmarkletReadable('https://example.github.io/ConsoleHelper/');
    expect(b.startsWith('javascript:void(')).toBe(true);
    expect(b).toContain('launcher.js');
    expect(b).toContain('__CH_BASE__');
    expect(b).toContain('r.ok');
    expect(b.match(/javascript:/g)?.length).toBe(1);
  });
});
