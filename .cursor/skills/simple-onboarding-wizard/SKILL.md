---
name: simple-onboarding-wizard
description: >-
  Builds simple click-copy-paste onboarding wizards for non-developers. Use when
  editing ConsoleHelper hub install steps, tips, keyboard hints, or first-run UX.
---

# Simple onboarding wizard

## Rules

- One job per step; one primary CTA.
- Show exact keys: `F12`, `Ctrl+V`, `Ctrl+S`, `Ctrl+P`.
- After copy → tell the next step immediately.
- Always offer «Не получилось?» → full code fallback.
- Language: product-owner-plain; no jargon without one-line gloss.

## Test

Each step visible; CTA advances or copies; fallback button present.
