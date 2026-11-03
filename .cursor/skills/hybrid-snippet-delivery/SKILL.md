---
name: hybrid-snippet-delivery
description: >-
  Hybrid snippet loader plus full-code fallback for ConsoleHelper. Use when
  changing launcher install, CSP issues, all-in-one bundles, or copy-loader UX.
---

# Hybrid snippet delivery

## Default

Short snippet: set `__CH_BASE__`, `fetch` tool JS, `eval`.

## Fallback

«Полный код» copies entire IIFE into clipboard for paste into Snippets.

## Do not break

- Same `tools.json` ids for both paths.
- Cache-bust with `Date.now()`.
- Document both in onboarding wizard.
