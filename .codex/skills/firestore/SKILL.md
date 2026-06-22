---
name: firestore
description: Work on Linhgiang Firebase Auth, Firestore schema, security rules, indexes, emulator setup, or data access helpers.
---

# Firestore

Use this workflow for Firebase-backed behavior.

## Starter Collections

- `households/{householdId}` - household metadata and `memberIds`.
- `households/{householdId}/members/{uid}` - member display labels and roles.
- `households/{householdId}/chores/{choreId}` - chore definitions, assignment, cadence, and current state.
- `households/{householdId}/shoppingItems/{itemId}` - shopping list items and bought status.
- `households/{householdId}/priceObservations/{observationId}` - source-dated price observations.
- `households/{householdId}/stores/{storeId}` - store metadata and preferred names.
- `households/{householdId}/settings/{settingId}` - household preferences.

## Workflow

1. Read `src/lib/firestore.js`, `firestore.rules`, and relevant tests before editing.
2. Keep durable ownership tied to Firebase auth uids.
3. Update security rules when adding or changing collections.
4. Avoid composite indexes unless a query truly requires them.
5. Prefer emulator validation for data-mutating or rules-sensitive changes.
6. Clearly state when rules changed locally but were not deployed.

## Privacy

- Household data is private to members.
- Do not log personal schedules, purchases, or user ids unnecessarily.
- Do not commit service-account keys or local `.env` files.
