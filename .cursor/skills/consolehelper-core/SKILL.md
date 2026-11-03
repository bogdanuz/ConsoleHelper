---
name: consolehelper-core
description: >-
  Guides ConsoleHelper architecture, delivery (snippet/loader/hub), and in-page
  tool contracts. Use when building tools, launcher, GitHub Pages catalog,
  fetch loaders, or deciding DOM vs OCR vs paste flows.
---

# ConsoleHelper Core

## Constraints

- No browser extensions on work PC → snippet / console / hub only.
- GitHub Pages cannot read another tab's DOM.
- Never delete files → move to `fordelete/`.

## Delivery

1. Prefer one DevTools snippet that loads `launcher.js` from Pages.
2. Provide **Copy full code** fallback for strict CSP.
3. Hub paste/OCR is the path when DOM access is impossible.

## Tool contract

- File: `public/tools/<id>.js` as IIFE.
- Register in `public/tools.json`.
- Destroy previous UI on re-run (`window.__ch_<id>`).
- Read-only toward page data; overlays only.

## Shared algorithms

Implement once in `src/core/`, test in `tests/unit/`, port or bundle into tools.

## Docs on every change

Update `docs/STATUS.md`, `docs/CHANGELOG.md`, active sprint file.

## See also

- [docs/CONCEPT.md](../../../docs/CONCEPT.md)
- [docs/architecture/OVERVIEW.md](../../../docs/architecture/OVERVIEW.md)
- skill `table-normalize` for extra-row fixing
