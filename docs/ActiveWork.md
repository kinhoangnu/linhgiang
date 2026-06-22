# Active Work

Use this file as the compact continuity packet for routine Codex sessions. Keep it short enough that `$startsession` can read it every time without loading the full project history.

## Current Focus

Initial scaffold is complete and Firebase Hosting is live. The app now has a mobile-first BCVN-inspired PWA shell, local starter mode, an authenticated Firestore sync path for the configured household id, a weekly chore calendar, and a shopping board. Firestore rules allow the first account to create the household and a second authenticated account to self-join automatically.

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

## Next Task

Recommended follow-up for the next session:

1. Create or sign in to the first household account at the live Hosting URL.
2. Confirm `households/linhgiang-home` contains that account in `memberIds`.
3. Create or sign in to the partner account and confirm it self-joins without manual UID setup.
4. Validate live Auth/Firestore weekly chore edits, rollover completions, and shopping writes from both accounts.
5. Decide whether grocery prices will be manually entered, imported from receipts, or sourced from store APIs.

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
- `.codex/skills/**`
- `tests/app.spec.js`

## Validation Baseline

- `npm run build` passed on 2026-06-22 after the PWA polish and weekly calendar changes.
- `npm run test` passed on 2026-06-22 with 15/15 Playwright checks passing after the PWA polish and weekly calendar changes.
- Responsive visual checks passed on 2026-06-22 at 375px, 768px, and 1280px with no horizontal overflow.
- `npm run deploy:hosting` passed on 2026-06-22 after the PWA polish and weekly calendar changes, releasing `https://linhgiang-19932004.web.app`.
- `npm run deploy:rules` passed on 2026-06-22 and released `firestore.rules` plus `firestore.indexes.json`.
- Previous live Hosting check passed on 2026-06-22 with HTTP 200 after the automatic self-join deploy.
- Live Hosting check passed on 2026-06-22 after the PWA polish and weekly calendar deploy with HTTP 200.
- Playwright Chromium was installed locally with `npx playwright install chromium`.

## Open Risks

- Automatic self-join is capped at two household members in `firestore.rules`; future multi-member setup should use an explicit invite flow.
- Cloud persistence is unseeded until the first signed-in member creates `households/linhgiang-home`.
- Existing Firestore chore documents are normalized client-side; live household data should be checked after deploy to confirm old starter chores display with the new weekly calendar fields.
- Grocery price data is manually observed/sample data until a trusted source is chosen.
- Hosting is live, and the signed-out app still uses local starter persistence.

## Do Not Forget

- Preserve unrelated user changes in the worktree.
- Keep production and emulator Firebase data clearly separated.
- Do not commit `.env`, Firebase cache, Playwright reports, `node_modules`, or secrets.
- For every feature or Firestore behavior change, add or update focused tests and run the relevant command.
- For UI work, verify mobile around 375px, tablet around 768px, and desktop around 1280px.
- `$endsession` should commit and push validated intended changes to `origin/main`.
