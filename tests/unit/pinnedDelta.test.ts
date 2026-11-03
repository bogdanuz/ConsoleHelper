/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { pinnedDelta } from '../../src/core/pinnedDelta';

describe('pinnedDelta', () => {
  it('shifts a stuck sticky header back to its layout position', () => {
    const head = document.createElement('div');
    head.style.position = 'sticky';
    document.body.appendChild(head);
    Object.defineProperty(head, 'offsetTop', { value: 80 });
    head.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    const delta = pinnedDelta(head, 900);
    // visual document Y = 0 + 900, layout = 80 → subtract 820
    expect(delta).toBe(820);
  });

  it('skips position:fixed chrome', () => {
    const bar = document.createElement('div');
    bar.style.position = 'fixed';
    document.body.appendChild(bar);
    expect(pinnedDelta(bar, 0)).toBeNull();
  });

  it('returns 0 for ordinary flow text', () => {
    const p = document.createElement('p');
    document.body.appendChild(p);
    expect(pinnedDelta(p, 0)).toBe(0);
  });
});
