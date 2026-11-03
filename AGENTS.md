# Agent notes — ConsoleHelper

## Always

- Read `docs/STATUS.md` before starting work.
- Never delete → move to `fordelete/` with date + reason (`fordelete/` is gitignored — local only).
- After changes: update STATUS, CHANGELOG `[Unreleased]`, active sprint.
- New logic → tests; run `npm test` / `npm run verify` before commit.
- Always end meaningful work with: version (and bump if needed) + ready-to-paste commit message for the owner.

## Skills

Project (`.cursor/skills/`):

- `consolehelper-core` — delivery, tools contract
- `table-normalize` — лишние строки / name+id
- `project-docs` — документация

Personal (user store):

- `github-pages-static`
- `ux-ui-2026-minimal`

## Stack

Vite + TypeScript + Vitest. In-page tools = IIFE in `public/tools/`.
