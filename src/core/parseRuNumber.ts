/**
 * Parse Russian-formatted money/number: "12 763,50" / "—"/"" → number | null
 */
export function parseRuNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s || s === '—' || s === '-' || s === '–') return null;
  const cleaned = s
    .replace(/\s/g, '')
    .replace(/₽/g, '')
    .replace(/%/g, '')
    .replace(/,/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function isZeroish(raw: string): boolean {
  const n = parseRuNumber(raw);
  if (n === null) {
    const t = raw.trim();
    return t === '' || t === '—' || t === '-' || t === '–' || t === '0';
  }
  return n === 0;
}

/** Short code / project id under a title line */
export function looksLikeId(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 64) return false;
  if (/\s{2,}/.test(t) && t.length > 40) return false;
  // money / plain metrics are not ids
  if (parseRuNumber(t) !== null) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    return true;
  }
  return (
    /^[A-ZА-Я]{1,6}[-_]\d[\w.-]*$/i.test(t) ||
    /^[A-Z]{2,}[-_]\d[\w.-]*$/i.test(t) ||
    /^PJ[-_][\w.-]+$/i.test(t) ||
    /^[A-ZА-Я]{2,8}\d{2,8}([.-][\w.-]+)?$/i.test(t) ||
    (/^\d{2,}([-_]\d+){1,4}$/.test(t) && t.length <= 32)
  );
}

/** Title-like first cell (not an id / not a bare number) */
export function looksLikeTitle(text: string): boolean {
  const t = text.trim();
  if (!t || looksLikeId(t)) return false;
  if (parseRuNumber(t) !== null) return false;
  return t.length >= 3 && /[A-Za-zА-Яа-я]/.test(t);
}
