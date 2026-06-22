---
name: docs
description: Maintain Linhgiang documentation and Codex guidance. Use automatically for README, AGENTS.md, docs, project documentation, comments, or workflow documentation requests.
---

# Docs

Use this workflow to keep project documentation useful without adding noise.

## Workflow

1. Identify what changed or needs explanation.
2. Update `AGENTS.md` only when compact guidance, commands, or guardrails change.
3. Update `docs/ActiveWork.md` when session continuity changes.
4. Update `docs/Roadmap.md` for phase/history details too large for compact context.
5. Update `.codex/skills` when workflows change.
6. Add comments only for non-obvious business rules, privacy assumptions, or compatibility choices.
7. Run `npm run build` when code or app-facing docs changes could affect the app.

## Style

- Use `Linhgiang` for the app shorthand.
- Use precise Firebase collection and rule names.
- Do not document secrets or private environment values.
