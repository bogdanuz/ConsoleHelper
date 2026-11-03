---
name: github-pages-release
description: >-
  Release ConsoleHelper to GitHub Pages with SemVer and changelog. Use when
  deploying, bumping version, or writing release notes for the static hub.
---

# GitHub Pages release

1. `npm run verify` green.
2. Bump `package.json` version; move CHANGELOG `[Unreleased]` → `[x.y.z]`.
3. Build `dist/` with `base: '/ConsoleHelper/'`.
4. Deploy via Actions or `gh-pages` branch.
5. Update STATUS with live URL.
