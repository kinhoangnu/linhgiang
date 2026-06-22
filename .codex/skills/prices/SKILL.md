---
name: prices
description: Work on Linhgiang shopping price observations, lowest-price logic, grocery source freshness, and future market price integrations.
---

# Prices

Use this workflow whenever shopping recommendations, market prices, price imports, or grocery source data are involved.

## Workflow

1. Identify whether price data is manually observed, receipt-derived, imported, or live from an external source.
2. Store source/store, price, package size, unit, currency, and observed date.
3. Compare normalized prices only when units are compatible or conversion is explicit.
4. Show freshness or last-checked information near recommendations.
5. Treat stale, missing, or estimated prices honestly.
6. If using external sources, prefer official APIs or user-owned receipt data and respect site terms.
7. Add tests for lowest-price calculations and stale/missing data states.

## Guardrails

- Do not claim a price is current unless it was verified for that exact date/source.
- Do not scrape protected sites or bypass access controls.
- Keep price recommendations explainable: show where to buy and why it is lowest.
