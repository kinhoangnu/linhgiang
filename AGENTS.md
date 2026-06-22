# AGENTS.md

Compact Codex guidance for the Linhgiang household management app.

## Project

Linhgiang is a private household app for two partners to coordinate daily chores, shopping needs, and later other home operations. The first product surface is a daily task board showing what needs doing, who owns it, and who completed it. The second surface is a shopping board that tracks items to buy, compares observed market prices, and points to the lowest known place to buy each item.

Stack: React 18, Vite, Firebase Authentication, Cloud Firestore, Firebase Hosting on project `linhgiang-19932004`, Playwright, and project-local Codex skills.

## Build

```powershell
npm install
npm run dev
npm run build
npm run preview
npm run test
npm run emulators
npm run deploy:hosting
npm run deploy:rules
```

Use `npm install` when dependencies are missing or `package-lock.json` has changed.

## Structure

- `src/App.jsx` - first usable app surface for chores and shopping.
- `src/firebase.js` - Firebase app init from `VITE_FIREBASE_*` variables.
- `src/lib/householdData.js` - starter domain data and grocery price helpers.
- `src/lib/firestore.js` - Firestore path helpers for future persistence work.
- `src/lib/useLocalStorage.js` - local starter persistence while Firebase wiring is being finished.
- `css/styles.css` - shared responsive app styles.
- `tests` - Playwright smoke and workflow tests.
- `docs/ActiveWork.md` - compact session continuity packet.
- `docs/Roadmap.md` - larger roadmap/history notes.

## Codex Workflows

Project-local Codex skills live under `.codex/skills`:

- `$startsession` - compact routine startup using `docs/ActiveWork.md`, git state, and build checks.
- `$startsession-full` - deeper onboarding when compact context is insufficient.
- `$plan` - gather focused context and produce an implementation plan before editing.
- `$feature` - implement a scoped household feature end to end.
- `$ui` - work on responsive UI, CSS, screenshots, and interaction polish.
- `$firestore` - work with Firebase Auth, Firestore schema, rules, indexes, and data helpers.
- `$prices` - work on shopping price observations, lowest-price logic, and future market integrations.
- `$test` - run the available validation plan.
- `$deploy` - deploy Firebase Hosting or Firestore targets intentionally.
- `$review` - inspect changes for bugs, privacy risks, regressions, and missing tests.
- `$debugbuild` - diagnose npm, Vite, Firebase, Playwright, or build failures.
- `$docs` - keep README, AGENTS.md, docs, and Codex guidance current.
- `$endsession` - review, validate, update continuity docs, commit intended changes, and push `main`.

Each skill includes trigger-focused metadata and `allow_implicit_invocation: true`; use the matching skill automatically whenever a request touches its area.

## Decisions

- Firebase Authentication owns identity. Cloud Firestore should own durable household data.
- The app starts with local demo persistence so the interface is usable before Firebase web config is filled in.
- Production household data should be scoped under `households/{householdId}` and protected by membership checks.
- Use member names as display labels, but use authenticated user ids for authorization and durable ownership.
- Price data must include source/store, observed price, package size/unit, and `observedAt` or `lastChecked` metadata.
- Lowest-price recommendations are only as accurate as the latest source-dated observations. Do not present stale or estimated prices as live facts.
- Keep secrets out of committed files. Firebase web config belongs in `.env`; service-account keys must never be committed.
- Prefer focused, practical household workflows over broad dashboards.
- Keep UI quiet, scan-friendly, mobile-first, and usable from a phone in the middle of chores or shopping.
- Add or update focused test coverage for new workflows, then run the relevant validation command before handoff.

## Current Status

Initial scaffold is complete and Firebase Hosting is live at `https://linhgiang-19932004.web.app`. The app has local starter mode plus an authenticated Firestore sync path for the configured household id. Firestore rules allow the first account to create the household and the second authenticated account to self-join automatically.

Known active follow-ups:

- Validate live Auth/Firestore writes after automatic household self-join.
- Consider whether automatic self-join should stay capped at two members or move to an invite-code flow.
- Decide whether grocery prices will be manually entered, imported from receipts, or sourced from store APIs.

## Validation

For normal app changes:

```powershell
npm run build
npm run test
```

For Firestore rules or data changes, prefer emulator validation before production deploy:

```powershell
npm run emulators
```

Deploy scopes stay separate unless the user explicitly asks for multiple targets:

```powershell
npm run deploy:hosting
npm run deploy:rules
```
