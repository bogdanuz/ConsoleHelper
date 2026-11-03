export type Fragment = {
  t: string;
  x1: number;
  x2: number;
  y: number;
  h: number;
};

export type NormalizeOptions = {
  /** Merge id-like continuation rows into previous */
  mergeIdRows?: boolean;
  /** Split first cell "title\\nid" into two columns */
  splitMultilineName?: boolean;
  /** Extract trailing (DEPT) into own column */
  extractDept?: boolean;
  /** Drop rows where all cells empty */
  dropEmpty?: boolean;
  /** Drop rows where all numeric-looking cells are 0 / — / empty (keeps name) */
  dropAllZeroMetrics?: boolean;
};

export type NormalizeResult = {
  rows: string[][];
  meta: {
    inputRows: number;
    outputRows: number;
    merged: number;
    splitName: number;
  };
};
