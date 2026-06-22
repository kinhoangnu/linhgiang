---
name: startsession-full
description: Deeply onboard into Linhgiang when compact session context is missing, stale, or insufficient.
---

# Start Session Full

Use this when routine startup does not provide enough context.

## Workflow

1. Read `AGENTS.md`, `docs/ActiveWork.md`, `docs/Roadmap.md`, `README.md`, and relevant config files.
2. Inspect git state with `git status --short --branch`, `git diff --stat`, and recent commit history when available.
3. Inspect project shape with focused `rg --files`, avoiding noisy output.
4. Confirm Firebase project wiring, scripts, tests, and deployment boundaries.
5. Run `npm install` only if dependencies are missing or lockfile state requires it.
6. Run `npm run build`.
7. Update `docs/ActiveWork.md` if compact context was missing or outdated.
8. Report current state, validation, risks, and recommended next work.

## Guardrails

- Do not overwrite existing work.
- Keep broad reading purposeful and summarize compactly.
- Do not deploy during onboarding.
