# Linhgiang Roadmap

Use this document for larger project history and phase details that are too large for `AGENTS.md`. Keep `AGENTS.md` and `docs/ActiveWork.md` compact so routine Codex sessions stay cheap.

## Foundation - App, Firebase, And Codex

Status: in progress.

Goals:

- Create a React + Vite app that opens directly into the household dashboard.
- Configure Firebase Hosting and Firestore for project `linhgiang-19932004`.
- Add starter Firestore rules for household-scoped data.
- Add Playwright smoke coverage.
- Add project-local Codex skills and continuity docs based on the BCVN setup.

## Weekly Chores

Status: weekly calendar implemented with local starter persistence and Firestore sync path.

Planned behavior:

- Show daily, once-off, and selected-weekday household tasks in a weekly calendar.
- Let users add, edit, and remove tasks while applying changes to future occurrences.
- Mark completion with who completed it, whether both people helped, and when.
- Surface unfinished rollover counts, difficulty, due timing, and completed/open counts.
- Keep history for accountability and later recurring-task analytics.

## Shopping And Prices

Status: starter UI implemented with local/sample observations; source strategy pending.

Planned behavior:

- Track items to buy, quantity, category, and bought status.
- Store observed price offers by store, price, package size, unit, and observed date.
- Compute the lowest known price for each item.
- Flag items that need a fresh price check.
- Later integrate receipts, store APIs, or trusted feeds where allowed.

## Household Membership And Auth

Status: pending.

Planned behavior:

- Sign in with Firebase Authentication.
- First user creates the household.
- Partner joins through an invitation code or owner approval.
- Rules use authenticated user ids and household membership, not display names.

## Future Household Modules

Status: backlog.

Candidate modules:

- Bills and subscriptions.
- Cleaning schedule templates.
- Pantry inventory.
- Shared meal planning.
- Maintenance reminders.
- Important documents and warranty dates.
- Home budget snapshots.

## Deployment And Operations

Status: initial config in place.

Known follow-ups:

- Deploy hosting after build validation.
- Deploy Firestore rules only after emulator or careful rules review.
- Keep production and emulator validation clearly separated.
- Avoid committing secrets or local environment files.
