# Agent notes — ConsoleHelper

## Always

- Read `docs/STATUS.md` before starting work.
- Never delete → move to `fordelete/` with date + reason.
- After changes: update STATUS, CHANGELOG `[Unreleased]`, active sprint.
- New logic → tests; run `npm test`.

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
