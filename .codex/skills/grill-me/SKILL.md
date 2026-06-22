---
name: grill-me
description: Interview the user one decision at a time about a Linhgiang feature, architecture, or plan until shared understanding is reached.
---

# Grill Me

Use this workflow to turn a fuzzy household-management idea into a decision-complete plan.

## Workflow

1. Read the user's proposal carefully.
2. Inspect relevant repo files before asking anything discoverable from code or docs.
3. Identify decision branches: goal, users, scope, data, UI, backend, security, testing, rollout, risks, and future expansion.
4. Ask exactly one question per turn.
5. Include a recommended answer and short reason.
6. Keep a compact running summary when the exchange is long.
7. When all meaningful branches are resolved, present a concise implementation plan.

## Question Format

```text
Question: <one focused question>

My recommendation: <recommended answer>

Why: <one or two sentences explaining the tradeoff>
```

## Guardrails

- Do not implement while grilling unless the user explicitly ends the interview and asks for implementation.
- Do not ask where something is if it can be found with repository exploration.
- Do not batch unrelated questions.
