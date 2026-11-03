import { normalizeRows } from '../core/normalizeRows';
import { parseClipboard } from '../core/parseClipboard';
import { toCsv, toExcelHtml, toTsv } from '../core/exportTable';

export type PastePanelHandlers = {
  getStatus: () => string;
  getRows: () => string[][];
  ingestText: (text: string, smart?: boolean) => { ok: boolean; message: string };
  setSmart: (smart: boolean) => void;
  isSmart: () => boolean;
  downloadExcel: () => Blob;
  downloadCsv: () => Blob;
  copyTsv: () => string;
};

/** Pure hub paste logic (no DOM) — for tests + main.ts wiring. */
export function createPasteSession(): PastePanelHandlers {
  let rawRows: string[][] = [];
  let rows: string[][] = [];
  let smart = true;
  let status = 'Вставь таблицу сюда (Ctrl+V) или нажми «Показать таблицу»';
  let lastFormat = '';

  const formatLabel = (f: string) => {
    if (f === 'html') return 'из таблицы сайта';
    if (f === 'tsv') return 'из Excel / текста';
    if (f === 'csv') return 'из CSV';
    return '';
  };

  const refresh = () => {
    rows = smart ? normalizeRows(rawRows).rows : rawRows.map((r) => [...r]);
    const kind = formatLabel(lastFormat);
    status = rows.length
      ? `Строк: ${rows.length}${kind ? ` · ${kind}` : ''}${smart ? ' · умная склейка' : ' · как есть'}`
      : status;
    return status;
  };

  return {
    getStatus: () => status,
    getRows: () => rows.map((r) => [...r]),
    isSmart: () => smart,
    setSmart: (v) => {
      smart = v;
      if (rawRows.length) refresh();
    },
    ingestText: (text, smartFlag) => {
      if (typeof smartFlag === 'boolean') smart = smartFlag;
      const parsed = parseClipboard({ text, html: text });
      if (!parsed.rows.length) {
        status = 'Не похоже на таблицу. Скопируй ячейки из Excel и вставь сюда ещё раз.';
        return { ok: false, message: status };
      }
      rawRows = parsed.rows.map((r) => [...r]);
      lastFormat = parsed.format;
      refresh();
      return { ok: true, message: status };
    },
    downloadExcel: () =>
      new Blob(['\ufeff' + toExcelHtml(rows)], { type: 'application/vnd.ms-excel' }),
    downloadCsv: () => new Blob(['\ufeff' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }),
    copyTsv: () => toTsv(rows),
  };
}
