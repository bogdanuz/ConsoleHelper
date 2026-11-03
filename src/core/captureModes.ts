import { normalizeRows } from './normalizeRows';
import { pairLabelValues } from './pairLabelValues';
import { looksLikeTitle, parseRuNumber } from './parseRuNumber';
import type { Fragment } from './types';

export type CaptureModeInput = {
  rows: string[][];
  frags?: Fragment[] | null;
  labelValues?: boolean;
  codeColumn?: boolean;
  mergePx?: number;
};

/**
 * Base grid stays as captured.
 * «Подпись и число» replaces it only when the block really looks like labels over numbers.
 * «Код в столбец» then runs on that result and inserts a column only if a code is found.
 */
export function applyCaptureModes(input: CaptureModeInput): { rows: string[][]; note: string } {
  let rows = input.rows.map((r) => [...r]);
  let note = '';
  if (input.labelValues) {
    if (input.frags && input.frags.length) {
      const paired = pairLabelValues(input.frags, input.mergePx ?? 10);
      if (paired.use) rows = paired.rows;
      else note = 'не похоже на подписи над числами';
    } else note = 'не похоже на подписи над числами';
  }
  if (input.codeColumn) {
    rows = normalizeRows(rows, { mergeIdRows: true, splitMultilineName: true }).rows;
  }
  return { rows, note };
}

/** Hint only. Does not change the table. */
export function suggestHeaderRow(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const head = rows[0] ?? [];
  const next = rows[1] ?? [];
  const filled = head.filter((c) => String(c).trim()).length;
  if (!filled) return false;
  const numbersInHead = head.filter((c) => parseRuNumber(String(c)) !== null).length;
  if (numbersInHead) return false;
  const textish = head.filter((c) => looksLikeTitle(String(c))).length;
  const nums = next.filter((c) => parseRuNumber(String(c)) !== null).length;
  return textish >= 1 && textish >= Math.ceil(filled * 0.5) && nums >= 1;
}
