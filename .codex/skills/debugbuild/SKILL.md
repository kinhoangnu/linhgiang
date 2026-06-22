---
name: debugbuild
description: Diagnose and fix Linhgiang npm, Vite, React, Firebase, Playwright, emulator, build, or startup failures.
---

# Debug Build

Use this workflow to turn failing output into a small, validated fix.

## Workflow

1. Capture the failing command and exact errors.
2. Reproduce with the narrowest useful command:
   - Install failures: `npm install`.
   - Build failures: `npm run build`.
   - Playwright failures: `npm run test`.
   - Emulator issues: `npm run emulators`.
3. Classify the failure: syntax, dependency, Firebase config, rules/emulator, Playwright selector/timing, or environment.
4. Inspect only the owning files and nearby patterns.
5. Apply the smallest fix that preserves project conventions.
6. Rerun the failing command and broaden validation only when needed.
7. Report root cause, files changed, commands rerun, and remaining environment-dependent checks.

## Guardrails

- Do not weaken production security to satisfy a local test.
- Do not commit `.env`, reports, caches, or local browser state.
