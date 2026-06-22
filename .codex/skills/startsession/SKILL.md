---
name: startsession
description: Start a compact Linhgiang Codex work session. Use when the user says startsession, start session, begin work, sync the repo, or prepare this repo for routine continuation.
---

# Start Session

Begin by loading compact continuity context and checking whether the repo is ready for work.

## Workflow

1. Read `docs/ActiveWork.md`.
2. Read only the top-level project/build guardrails from `AGENTS.md` when needed.
3. If `docs/ActiveWork.md` is missing, stale, or insufficient, switch to `$startsession-full`.
4. Run `git status --short --branch`; if dubious ownership blocks git, use `git -c safe.directory=<repo path>` for read-only git commands.
5. If local changes exist, summarize them and do not overwrite or revert them.
6. Confirm `package.json`, `src`, `css`, `tests`, `firebase.json`, and `firestore.rules` exist.
7. If `node_modules` is missing or dependencies changed, run `npm install`.
8. Run `npm run build`.
9. Report branch/upstream state, active focus, build result, blockers, and next task.

## Guardrails

- Preserve user changes.
- Keep production and emulator Firebase data clearly separated.
- Do not deploy unless the user asks or the task clearly requires it.
- Do not print or commit secrets.
