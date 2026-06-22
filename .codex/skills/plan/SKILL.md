---
name: plan
description: Prepare a Linhgiang implementation plan. Use when the user says plan, planmode, plan mode, create a plan, or asks Codex to gather context before proposing implementation steps.
---

# Plan

Gather enough repository context to produce a useful implementation plan before editing files.

## Workflow

1. Read `AGENTS.md` and `docs/ActiveWork.md` when current status matters.
2. Inspect git state with `git status --short --branch`.
3. Use `rg` to find relevant app, CSS, Firestore, rule, test, or documentation files.
4. Read the smallest set of owning files needed for the request.
5. Produce a plan with context, ordered steps, validation commands, and real blockers.
6. Wait for approval before editing when the user explicitly requested plan mode or asked for a plan only.

## Priorities

- Prefer existing React, Firebase, CSS, and test patterns.
- Include Firestore rule/index changes when data access changes.
- Include grocery price freshness and source concerns when shopping recommendations change.
