import { parseRuNumber } from './parseRuNumber';
import type { Fragment } from './types';

type Phrase = { t: string; x1: number; x2: number; y: number; h: number; num: boolean };

function isNumToken(t: string): boolean {
  const s = t.trim();
  if (!s) return false;
  if (parseRuNumber(s) !== null) return true;
  return /%$/.test(s);
}

function clusterLines(frags: Fragment[], tol: number): { y: number; items: Fragment[] }[] {
  const sorted = [...frags].sort((a, b) => a.y - b.y || a.x1 - b.x1);
  const lines: { y: number; items: Fragment[] }[] = [];
  for (const f of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(f.y - last.y) <= tol) {
      last.items.push(f);
      last.y = (last.y * (last.items.length - 1) + f.y) / last.items.length;
    } else lines.push({ y: f.y, items: [f] });
  }
  return lines;
}

function mergeLine(items: Fragment[], mergePx: number): Phrase[] {
  const sorted = [...items].sort((a, b) => a.x1 - b.x1);
  const out: Phrase[] = [];
  for (const it of sorted) {
    const prev = out[out.length - 1];
    const gap = prev ? it.x1 - prev.x2 : 999;
    const join =
      prev &&
      gap <= mergePx &&
      gap >= -2 &&
      ((isNumToken(prev.t) && isNumToken(it.t)) || (!isNumToken(prev.t) && !isNumToken(it.t)));
    if (prev && join) {
      prev.t += (gap > 1 ? ' ' : '') + it.t;
      prev.x2 = Math.max(prev.x2, it.x2);
    } else {
      out.push({ t: it.t, x1: it.x1, x2: it.x2, y: it.y, h: it.h, num: false });
    }
  }
  for (const p of out) p.num = isNumToken(p.t);
  return out;
}

function overlapRatio(a: { x1: number; x2: number }, b: { x1: number; x2: number }): number {
  const inter = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  if (inter <= 0) return 0;
  const minW = Math.min(a.x2 - a.x1, b.x2 - b.x1);
  return minW <= 1 ? 0 : inter / minW;
}

/**
 * Cards where a label sits above its number → two columns: label | value.
 * Regular tables (text and numbers on the same line) are left alone.
 */
export function pairLabelValues(
  frags: Fragment[],
  mergePx = 10,
): { rows: string[][]; use: boolean; paired: number } {
  const empty = { rows: [] as string[][], use: false, paired: 0 };
  if (frags.length < 4) return empty;

  const hs = [...frags.map((f) => f.h)].sort((a, b) => a - b);
  const tol = Math.max(4, hs[Math.floor(hs.length / 2)]! * 0.65);
  const lines = clusterLines(frags, tol).map((l) => ({
    y: l.y,
    phrases: mergeLine(l.items, mergePx),
  }));

  let mixed = 0;
  for (const line of lines) {
    const hasText = line.phrases.some((p) => !p.num && /[A-Za-zА-Яа-я]/.test(p.t));
    const hasNum = line.phrases.some((p) => p.num);
    if (hasText && hasNum && line.phrases.length >= 3) mixed++;
  }
  if (mixed >= 2 && mixed >= lines.length * 0.35) return empty;

  const numbers = lines
    .flatMap((l) => l.phrases)
    .filter((p) => p.num)
    .sort((a, b) => a.y - b.y || a.x1 - b.x1);
  if (numbers.length < 3) return empty;

  const labels = lines.flatMap((l) => l.phrases).filter((p) => !p.num && /[A-Za-zА-Яа-я]/.test(p.t));
  const rows: string[][] = [];
  let paired = 0;
  for (const num of numbers) {
    let best: Phrase | null = null;
    let bestScore = -1e9;
    for (const lab of labels) {
      if (lab.y >= num.y - 1) continue;
      const dy = num.y - lab.y;
      if (dy > 72) continue;
      const ov = overlapRatio(lab, num);
      if (ov < 0.4) continue;
      const score = ov * 120 - dy;
      if (score > bestScore) {
        bestScore = score;
        best = lab;
      }
    }
    if (!best) continue;
    paired++;
    rows.push([best.t, num.t]);
  }

  const use = paired >= 3 && paired / numbers.length >= 0.55;
  return { rows: use ? rows : [], use, paired };
}
