/**
 * How many pixels a sticky element has drifted from its layout position.
 * Subtract from (visualTop + scrollY) so a stuck header is not inserted mid-table.
 * `null` = skip the node (position:fixed chrome).
 */
export function pinnedDelta(el: Element, scrollY: number): number | null {
  let n: Element | null = el;
  while (n && n !== document.documentElement) {
    const pos = getComputedStyle(n).position;
    if (pos === 'fixed') return null;
    if (pos === 'sticky') {
      const layout = layoutTop(n as HTMLElement);
      const visualDoc = n.getBoundingClientRect().top + scrollY;
      return visualDoc - layout;
    }
    n = n.parentElement;
  }
  return 0;
}

function layoutTop(el: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  let guard = 0;
  while (n && guard++ < 25) {
    y += n.offsetTop || 0;
    const next = n.offsetParent as HTMLElement | null;
    if (!next || next === n) break;
    n = next;
  }
  return y;
}
