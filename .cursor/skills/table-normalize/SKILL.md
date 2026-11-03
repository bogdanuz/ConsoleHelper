---
name: table-normalize
description: >-
  Normalizes broken visual tables into flat rows: merge multiline name+id cells,
  drop empty/zero rows, parse RU numbers, fix extra rows from spatial parsers.
  Use when fixing table layout, лишние строки, Excel export quality, or dense demo grids.
---

# Table Normalize

## Problem (from concept screenshot)

One logical entity often renders as **two visual text lines** (title + ID).  
Spatial parsers create **extra rows**. Goal: N entities → N rows (or N rows with split columns).

## Pipeline

1. Ingest rows (`string[][]`) from DOM / `buildGrid` / OCR / paste.
2. Detect id-like continuation rows.
3. Merge into parent or split into `name` + `id` columns.
4. Optional: extract dept suffix `(ЦУП)` → column.
5. Filter empty / all-zero rows per user flags.
6. Parse RU numbers for numeric export mode.

## Id heuristics

Treat a row as continuation of previous when most of:

- few non-empty cells (usually 1), aligned under name column;
- text matches `/^[A-ZА-Я]{0,4}[-_]?\d/i` or short token (`PJ-…`, code);
- previous row has a long title-like first cell.

## API (src/core)

- `normalizeRows(rows, options)` → `{ rows, meta }`
- `parseRuNumber(text)` → `number | null`
- `buildGrid(fragments, merge, gap)` → `string[][]`

## Tests required

Always add fixture: input with doubled rows → expected merged output.  
Keep screenshot-inspired fixture under `tests/unit/fixtures/`.

## Do not

- Guess-merge unrelated rows with different column shapes.
- Destroy raw export path — keep «raw» toggle in UI.
