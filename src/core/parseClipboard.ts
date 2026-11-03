export type ClipboardFormat = 'html' | 'tsv' | 'csv' | 'empty';

export type ClipboardInput = {
  /** plain text / TSV / CSV */
  text?: string;
  /** HTML fragment from clipboard */
  html?: string;
};

export type ParseClipboardResult = {
  rows: string[][];
  format: ClipboardFormat;
};

function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function pad(rows: string[][]): string[][] {
  const w = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => {
    const copy = [...r];
    while (copy.length < w) copy.push('');
    return copy;
  });
}

/** Extract first HTML table into a grid (DOM-free, fixture-friendly). */
export function parseHtmlTable(html: string): string[][] {
  const tableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  const body = tableMatch?.[1] ?? html;
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(body))) {
    const cells: string[] = [];
    const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(tr[1] ?? ''))) {
      cells.push(decodeEntities(cell[1] ?? ''));
    }
    if (cells.length) rows.push(cells);
  }
  return pad(rows);
}

/** Split one CSV/TSV line respecting quotes. */
export function splitDelimitedLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseDelimited(text: string, sep: string): string[][] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
  return pad(lines.map((l) => splitDelimitedLine(l, sep)));
}

function guessCsvSep(text: string): ';' | ',' {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
  const semis = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semis >= commas ? ';' : ',';
}

function looksLikeHtml(s: string): boolean {
  return /<table\b/i.test(s) || /<tr\b/i.test(s);
}

/**
 * Turn clipboard payload into a rectangular string grid.
 * Preference: HTML table → TSV (tabs) → CSV (; or ,) → single-column lines.
 */
export function parseClipboard(input: ClipboardInput): ParseClipboardResult {
  const html = (input.html || '').trim();
  const text = (input.text || '').replace(/^\uFEFF/, '').trim();

  if (html && looksLikeHtml(html)) {
    const rows = parseHtmlTable(html);
    if (rows.length) return { rows, format: 'html' };
  }

  if (text && looksLikeHtml(text)) {
    const rows = parseHtmlTable(text);
    if (rows.length) return { rows, format: 'html' };
  }

  if (!text) return { rows: [], format: 'empty' };

  if (text.includes('\t')) {
    return { rows: parseDelimited(text, '\t'), format: 'tsv' };
  }

  if (/[;,]/.test(text) && text.includes('\n')) {
    const sep = guessCsvSep(text);
    return { rows: parseDelimited(text, sep), format: 'csv' };
  }

  // one column of lines
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return { rows: pad(lines.map((l) => [l.trim()])), format: text.includes('\n') ? 'tsv' : 'empty' };
}
