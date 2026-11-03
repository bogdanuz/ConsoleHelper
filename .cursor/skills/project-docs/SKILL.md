---
name: project-docs
description: >-
  Maintains ConsoleHelper professional docs: STATUS, ROADMAP, CHANGELOG, sprints,
  README. Use when finishing a task, starting a sprint, changing scope, or when
  the user asks for status, plan, or documentation updates.
---

# Project Docs

## Source of truth

| Need | File |
|------|------|
| What now | `docs/STATUS.md` |
| Plan | `docs/ROADMAP.md` |
| History | `docs/CHANGELOG.md` |
| Why | `docs/CONCEPT.md` |
| How built | `docs/architecture/OVERVIEW.md` |
| Sprint tasks | `docs/sprints/sprint-N.md` |
| Public intro | `README.md` |

## After every meaningful step

1. Tick sprint task status.
2. Refresh STATUS «Сделано / В работе / Следующий шаг».
3. Append CHANGELOG `[Unreleased]` bullet (Added/Changed/Fixed).
4. If user-facing flow changed → README.

## Sprint close

- Mark DoD checkboxes.
- Move leftover tasks to next sprint file.
- Bump ROADMAP stage marker.
