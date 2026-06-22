---
name: feature
description: Implement a scoped Linhgiang feature end to end. Use automatically when the user asks to add, implement, create, build, wire up, update, or finish household app behavior.
---

# Feature

Use this workflow for normal implementation tasks.

## Workflow

1. Read `AGENTS.md` and inspect git status.
2. Gather focused context with `rg` before editing.
3. Choose companion skills when relevant:
   - `$ui` for responsive layout, CSS, screenshots, or interaction polish.
   - `$firestore` for Auth, Firestore helpers, rules, indexes, or emulator work.
   - `$prices` for shopping price logic, observations, or market integrations.
   - `$docs` when README, AGENTS.md, or continuity docs need updates.
   - `$test` for validation planning or execution.
4. Implement conservatively and keep changes scoped to the request.
5. Update Firestore rules when data access changes.
6. Add or update focused test coverage for user-facing behavior.
7. Run `npm run build` and relevant tests.
8. Summarize changes, validation, and residual risk.

## Defaults

- Favor simple React state and existing helpers over new libraries.
- Keep household data private by default.
- Keep UI fast to scan on mobile.
