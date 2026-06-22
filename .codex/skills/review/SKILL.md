---
name: review
description: Review Linhgiang changes without committing. Use automatically when the user asks for review, code review, inspect changes, check work, audit the diff, find bugs, or identify risks.
---

# Review

Use code-review stance: findings first, ordered by severity, with file and line references.

## Workflow

1. Inspect current changes:
   - `git status --short --branch`
   - `git diff --stat`
   - `git diff`
2. Review for Linhgiang-specific risks:
   - Household privacy or membership rule mistakes.
   - Firestore helper/rule mismatches.
   - Price recommendations without freshness/source metadata.
   - Local demo state accidentally treated as durable production state.
   - Missing Playwright coverage for changed workflows.
   - Mobile layout regressions.
3. Focus on actionable findings with impact and concrete fix direction.
4. Report findings first, then open questions, then a brief change summary.

## Boundaries

- Do not edit or commit during review unless the user asks for fixes.
- Do not revert user changes.
