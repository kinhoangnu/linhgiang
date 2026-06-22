---
name: deploy
description: Deploy Linhgiang Firebase targets. Use when the user says deploy, publish, push live, deploy hosting, deploy rules, or asks for the live Firebase URL.
---

# Deploy

Deploy only the Firebase targets needed for the current Linhgiang changes.

## Workflow

1. Inspect scope with `git status --short --branch` and relevant diffs.
2. Infer deploy targets:
   - Hosting: `src/**`, `css/**`, `public/**`, `index.html`, `vite.config.*`, `package*.json`, or `dist/**`.
   - Firestore rules: `firestore.rules`.
   - Firestore indexes: `firestore.indexes.json`.
3. If only docs, tests, or Codex skills changed, do not deploy.
4. Validate before deploy:
   - Hosting: `npm run build`.
   - Rules/indexes: review changes and prefer emulator validation.
5. Deploy:
   - Hosting: `npm run deploy:hosting`.
   - Rules/indexes: `npm run deploy:rules`.
6. Report changed paths, validation, deploy output summary, live URL when known, and any skipped target.

## Safety

- Do not deploy production rules accidentally.
- Keep deployment scopes separate unless explicitly asked.
- Do not print or commit secrets.
