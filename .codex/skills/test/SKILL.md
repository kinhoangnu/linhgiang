---
name: test
description: Run the Linhgiang validation plan. Use when the user says test, run tests, validate, check the build, show results, or asks for Playwright/Firebase test results.
---

# Test

Run available validation and report results clearly.

## Commands

Build:

```powershell
npm run build
```

Playwright:

```powershell
npm run test
```

Firebase emulators:

```powershell
npm run emulators
```

## Workflow

1. Run `npm install` first only when dependencies are missing or lockfile state requires it.
2. Run `npm run build` for code/config changes.
3. Run targeted Playwright tests for user-facing flows.
4. Use Firebase emulators for Auth/Firestore/rules changes when feasible.
5. Report commands run, pass/fail results, warnings, skipped checks, and residual risk.
