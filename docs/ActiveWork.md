# Active Work

Use this file as the compact continuity packet for routine Codex sessions. Keep it short enough that `$startsession` can read it every time without loading the full project history.

## Current Focus

Initial scaffold is complete. Next session focus is Firebase Hosting: confirm the project/site setup, deploy the Vite build, and verify the live URL.

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

## Next Task

Recommended follow-up for the next session:

1. Confirm Firebase Hosting is enabled for project `linhgiang-19932004`.
2. Run `npm run build`.
3. Deploy hosting with `npm run deploy:hosting`.
4. Open and verify the live Hosting URL.
5. After hosting is verified, fill `.env` with Firebase web app config and begin Auth/Firestore persistence work.

## Relevant Files

- `AGENTS.md`
- `README.md`
- `src/App.jsx`
- `src/firebase.js`
- `src/lib/householdData.js`
- `src/lib/firestore.js`
- `src/lib/useLocalStorage.js`
- `css/styles.css`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `.codex/skills/**`
- `tests/app.spec.js`

## Validation Baseline

- `npm run build` passed on 2026-06-22.
- `npm run test` passed on 2026-06-22 with 2/2 Playwright checks passing.
- Playwright Chromium was installed locally with `npx playwright install chromium`.

## Open Risks

- Firebase web app credentials are not filled in yet, so the first app version uses local starter persistence.
- Grocery price data is manually observed/sample data until a trusted source is chosen.
- Firestore rules are local only until `npm run deploy:rules` succeeds.
- Hosting is local only until `npm run deploy:hosting` succeeds; this is the planned next-session focus.

## Do Not Forget

- Preserve unrelated user changes in the worktree.
- Keep production and emulator Firebase data clearly separated.
- Do not commit `.env`, Firebase cache, Playwright reports, `node_modules`, or secrets.
- For every feature or Firestore behavior change, add or update focused tests and run the relevant command.
- For UI work, verify mobile around 375px, tablet around 768px, and desktop around 1280px.
- `$endsession` should commit and push validated intended changes to `origin/main`.
