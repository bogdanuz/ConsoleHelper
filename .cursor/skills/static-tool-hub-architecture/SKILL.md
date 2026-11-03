---
name: static-tool-hub-architecture
description: >-
  Architecture for static tool catalogs on GitHub Pages without a backend.
  Use when designing ConsoleHelper hub, tool delivery, CORS/CSP limits, or Pages-only services.
---

# Static tool hub

## Shape

- Hub (HTML/TS) lists tools, copies loaders, hosts onboarding.
- Tools are plain IIFE JS under `public/tools/`.
- No server, no accounts; data stays in the browser.

## Rules

- `base` must match Pages path (`/ConsoleHelper/`).
- Catalog reads `tools.json`; loaders set `window.__CH_BASE__`.
- Prefer hybrid loader; keep full-code copy as CSP fallback.
