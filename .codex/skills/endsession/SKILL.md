---
name: endsession
description: End a Linhgiang Codex work session. Use when the user says endsession, end session, wrap up, finish session, review and commit, or asks Codex to review changes, run validation, update continuity docs, commit the latest Linhgiang changes with a short clear message, and push them to the main branch.
---

# End Session

Close the session by reviewing changes, validating them, updating continuity docs, committing only when the result is ready, and immediately pushing the commit to `main`.

## Workflow

1. Inspect changes:
   - Run `git status --short --branch`.
   - Run `git diff --stat`.
   - Run `git diff` for changed source and config files.
   - Keep unrelated user changes out of any commit unless the user explicitly includes them.
2. Update docs:
   - Update `docs/ActiveWork.md` with completed work, current focus, next task, validation baseline, and risks.
   - Update `docs/Roadmap.md` only when phase/history changed.
   - Update `AGENTS.md` only when compact guidance changed.
3. Validate:
   - Run `npm run build`.
   - Run targeted Playwright tests or `$test` when available and appropriate.
   - Be explicit if emulator services, production credentials, Hosting/IAM, or browser dependencies block validation.
4. Summarize:
   - List changed files grouped by purpose.
   - Note validation commands and results.
   - Call out known limitations or risks.
5. Commit and push:
   - Confirm the current branch is `main` before staging. If not on `main`, switch to `main` only when the worktree state makes that safe; otherwise stop and report the blocker.
   - Stage only intended files.
   - Commit with a short, clear imperative message.
   - Run `git push origin main` immediately after the commit succeeds.
   - If validation failed, intended changes are unclear, or the push is rejected, do not force-push; report the blocker.

## Safety

- Never run destructive git commands unless explicitly requested.
- Never force-push unless explicitly requested.
- Never commit secrets, `.env`, Firebase cache, Playwright reports, `node_modules`, or local browser state.
- Mention whether a commit was created and pushed, and include the commit hash when available.
