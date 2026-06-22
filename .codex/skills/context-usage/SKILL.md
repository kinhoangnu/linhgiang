---
name: context-usage
description: Monitor Codex session context usage and compact proactively when long Linhgiang work risks losing continuity.
---

# Context Usage

Protect long Linhgiang sessions from context bloat by checking context usage early and compacting at a safe stopping point.

## Workflow

1. Use exact platform telemetry when available; do not invent a percentage.
2. If exact usage is unavailable, estimate risk from transcript length, large outputs, long diffs, and tool rounds.
3. At risky natural boundaries, create a compact checkpoint with request, decisions, files changed, commands/results, blockers, and next action.
4. If a compaction tool exists, invoke it after the checkpoint. If not, keep the checkpoint concise and update `docs/ActiveWork.md` when useful.
5. Resume by re-reading the checkpoint and running `git status --short --branch`.

## Guardrails

- Do not compact mid-edit, mid-deploy, or while an approval prompt is unresolved.
- Do not nag the user about context unless action is needed.
