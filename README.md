# Linhgiang

A private household management app for daily chores, shared accountability, and grocery price tracking.

## What Is Initialized

- React + Vite app shell.
- Firebase project config for `linhgiang-19932004`.
- Firestore rules and indexes starter files.
- Playwright smoke test scaffold.
- Project-local Codex ecosystem based on the BCVN setup.
- Compact continuity docs in `docs/`.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Fill `.env` with the Firebase web app config from the Firebase console. The app keeps the board usable with local starter data when Firebase config is incomplete or no account is signed in.

For cloud sync, enable Email/Password sign-in in Firebase Auth. The first signed-in account creates and seeds the configured household document, and the second signed-in account can automatically join the household without manual UID setup.

## Scripts

```powershell
npm run dev
npm run build
npm run preview
npm run test
npm run emulators
npm run deploy:hosting
npm run deploy:rules
```

## Firebase

- Project id: `linhgiang-19932004`
- Hosting URL: `https://linhgiang-19932004.web.app`
- Hosting output: `dist/`
- Default household id: `linhgiang-home` via `VITE_FIREBASE_HOUSEHOLD_ID`
- Firestore location target in config: `europe-west4`
- Local emulator ports: Auth `9099`, Firestore `8080`, Hosting `5000`, UI `4000`

Deploy hosting after a successful build:

```powershell
npm run build
npm run deploy:hosting
```

Deploy Firestore rules/indexes only after reviewing and validating data-access changes:

```powershell
npm run deploy:rules
```
