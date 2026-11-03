import { isPercentText, parseRuNumber } from './parseRuNumber';

export type XlsxSheetJs = {
  utils: {
    aoa_to_sheet: (data: (string | number)[][]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
  };
  write: (wb: unknown, opts: { bookType: string; type: string }) => ArrayBuffer;
};

/** Convert grid to AOA with real numbers where parseable. */
export function gridToAoa(rows: string[][]): (string | number)[][] {
  return rows.map((row) =>
    row.map((cell) => {
      if (isPercentText(String(cell))) return String(cell);
      const n = parseRuNumber(String(cell));
      return n === null ? String(cell) : n;
    }),
  );
}

export function buildXlsxArrayBuffer(XLSX: XlsxSheetJs, rows: string[][]): ArrayBuffer {
  const aoa = gridToAoa(rows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}
