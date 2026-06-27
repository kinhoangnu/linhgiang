# Active Work

Use this file as the compact continuity packet for routine Codex sessions. Keep it short enough that `$startsession` can read it every time without loading the full project history.

## Current Focus

Initial scaffold is complete and Firebase Hosting is live. The app now has a mobile-first BCVN-inspired PWA shell, local starter mode, an authenticated Firestore sync path for the configured household id, an available-task board with saved task profiles, a chore history/points summary, and a shopping board. Firestore rules allow the first account to create the household and a second authenticated account to self-join automatically.

## Last Checkpoint

Started on 2026-06-22:

- Confirmed the new repo at `C:\Users\kinho\Documents\Linhgiang` had no committed files yet.
- Inspected `C:\Users\kinho\source\repos\bcvn` for the existing Codex setup.
- Chose the BCVN pattern: root `AGENTS.md`, `docs/ActiveWork.md`, `docs/Roadmap.md`, Firebase config files, Playwright, and `.codex/skills`.
- Set Firebase project id to `linhgiang-19932004`.
- Added the React/Vite starter app with a daily chore board and shopping price board.
- Added starter Firestore rules, Firebase Hosting config, Playwright smoke coverage, and local Codex skills.
- Installed dependencies, generated `package-lock.json`, set Git remote `origin`, and renamed the initial branch to `main`.
- Aligned `$endsession` with the BCVN workflow: validate, update continuity docs, commit intended changes, and push `main`.
- Built and deployed Firebase Hosting for project `linhgiang-19932004`; verified `https://linhgiang-19932004.web.app` returned HTTP 200.
- Fetched Firebase Web app config for `linhgiangwebapp` into ignored local `.env`.
- Added Email/Password Auth controls, UID-based member setup, and Firestore-backed chore/shopping persistence with local starter fallback.
- Expanded Playwright coverage to desktop, mobile, and tablet viewports.
- Redeployed Hosting with the Auth/Firestore bundle and deployed Firestore rules/indexes for the default database.
- Replaced the primary UID-based member setup path with automatic self-join for up to two authenticated household accounts.
- Redeployed Firestore rules/indexes and Hosting after the automatic self-join change; verified the live URL returned HTTP 200 and served the new JS bundle.
- Polished the UI into a cleaner dark BCVN-style mobile-first layout, collapsed secondary forms, added installable PWA metadata, registered a production service worker, and updated the app icon.
- Added a weekly chore calendar with add/edit/remove task controls, once/daily/weekday repeats, future-occurrence task versioning, automatic unfinished rollover, unfinished-day counts, difficulty colors, and per-completion "done by both people" tracking.
- Expanded Playwright coverage to 15 desktop/mobile/tablet checks covering PWA assets, chore CRUD, rollover, both-person completion, Firebase account controls, and shopping price guidance.
- Deployed the PWA polish and weekly chore calendar to Firebase Hosting and verified the live app returned HTTP 200.
- Replaced the weekly chore calendar with a single available-task list: all tasks are once-only, unfinished tasks roll forward with an `N days not done` note, completed tasks update saved profiles ranked by completion count, duplicate active tasks are blocked, and new dashboards start with no active chores or task suggestions.
- Added the private `households/{householdId}/taskProfiles/{profileId}` collection path for reusable task profiles.
- Added durable chore completion records in `households/{householdId}/choreCompletions/{completionId}` plus local starter persistence.
- Added a top-level Summary tab with weekly and monthly collapsible chore history, per-person task counts, and points.
- Renamed `Difficult` to `Hard`, kept legacy `difficult` normalization, and set chore points to Easy 1, Medium 2, Hard 4, Exceptional 6.
- Allowed active tasks with the same title when area, owner, due, or difficulty differs; only exact active duplicates are blocked.
- Updated the Playwright runner to choose a free Vite port and pass the actual base URL to Playwright when port 5173 is already occupied.

## Next Task

Recommended follow-up for the next session:

1. Create or sign in to the first household account at the live Hosting URL.
2. Confirm `households/linhgiang-home` contains that account in `memberIds`.
3. Create or sign in to the partner account and confirm it self-joins without manual UID setup.
4. Validate live Auth/Firestore available-task edits, `choreCompletions` writes, Summary totals, task-profile completion counts, rollover notes, and shopping writes from both accounts.
5. Decide whether automatic self-join should stay capped at two members or move to an invite-code flow.
6. Decide whether grocery prices will be manually entered, imported from receipts, or sourced from store APIs.

## Relevant Files

- `AGENTS.md`
- `README.md`
- `src/App.jsx`
- `src/firebase.js`
- `src/lib/householdData.js`
- `src/lib/firestore.js`
- `src/lib/useFirebaseAuth.js`
- `src/lib/useHouseholdBoard.js`
- `src/lib/useLocalStorage.js`
- `src/components/InstallPrompt.jsx`
- `css/styles.css`
- `public/manifest.webmanifest`
- `public/sw.js`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `scripts/run-playwright.mjs`
- `playwright.config.js`
- `.codex/skills/**`
- `tests/app.spec.js`

## Validation Baseline

- `npm run build` passed on 2026-06-22 after the PWA polish and weekly calendar changes.
- `npm run test` passed on 2026-06-22 with 15/15 Playwright checks passing after the PWA polish and weekly calendar changes.
- `npm run build` passed on 2026-06-23 after the available-task and saved-profile changes.
- `npm run test` passed on 2026-06-23 with 15/15 Playwright checks passing after the available-task and saved-profile changes.
- `npm run deploy:hosting` passed on 2026-06-23 after the available-task and saved-profile changes, releasing `https://linhgiang-19932004.web.app`.
- `npm run deploy:rules` passed on 2026-06-23 and released the `taskProfiles` Firestore rule path.
- `npm run build` passed on 2026-06-27 after chore completion history, Summary, exact duplicate matching, and Exceptional difficulty scoring.
- `npm run test` passed on 2026-06-27 with 21/21 Playwright checks passing after chore completion history, Summary, exact duplicate matching, and Exceptional difficulty scoring.
- `npm run deploy:hosting` passed on 2026-06-27 after chore completion history, Summary, exact duplicate matching, and Exceptional difficulty scoring, releasing `https://linhgiang-19932004.web.app`.
- `npm run deploy:rules` passed on 2026-06-27 and released the `choreCompletions` Firestore rule path.
- Live Hosting check passed on 2026-06-27 after deploy with HTTP 200.
- Live Hosting check passed on 2026-06-23 after deploy with HTTP 200.
- Responsive visual checks passed on 2026-06-22 at 375px, 768px, and 1280px with no horizontal overflow.
- `npm run deploy:hosting` passed on 2026-06-22 after the PWA polish and weekly calendar changes, releasing `https://linhgiang-19932004.web.app`.
- `npm run deploy:rules` passed on 2026-06-22 and released `firestore.rules` plus `firestore.indexes.json`.
- Previous live Hosting check passed on 2026-06-22 with HTTP 200 after the automatic self-join deploy.
- Live Hosting check passed on 2026-06-22 after the PWA polish and weekly calendar deploy with HTTP 200.
- Playwright Chromium was installed locally with `npx playwright install chromium`.

## Open Risks

- Automatic self-join is capped at two household members in `firestore.rules`; future multi-member setup should use an explicit invite flow.
- Cloud persistence is unseeded until the first signed-in member creates `households/linhgiang-home`.
- Existing Firestore chore documents are normalized client-side as once-only available tasks; live household data should be checked after deploy to confirm old recurring chores do not create unwanted active tasks.
- Existing completed chores do not have backfilled `choreCompletions` records; Summary starts from new completions recorded after this feature is live.
- Grocery price data is manually observed/sample data until a trusted source is chosen.
- Hosting is live, and the signed-out app still uses local starter persistence.

## Do Not Forget

- Preserve unrelated user changes in the worktree.
- Keep production and emulator Firebase data clearly separated.
- Do not commit `.env`, Firebase cache, Playwright reports, `node_modules`, or secrets.
- For every feature or Firestore behavior change, add or update focused tests and run the relevant command.
- For UI work, verify mobile around 375px, tablet around 768px, and desktop around 1280px.
- `$endsession` should commit and push validated intended changes to `origin/main`.
