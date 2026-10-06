# Pegasoft documentation ledger

Generated: 2026-09-28T13:23:18.867Z. Read [CURRENT.md](./CURRENT.md) first for operational status, then the baseline's active task; this index is a discovery aid; read historical packets and raw evidence only when a decision requires them. Re-run `node tools/docs/build-ledger.mjs` after 5–10 sessions/chats or when docs change.

## Canonical entry points

- [D004 Hero foundation repair sprints](../hero-reference/repair-sprints.md) — orientation
- [D005 S0 ordinary-page failure evidence](../hero-reference/repairs/s0/browser/README.md) — orientation
- [D006 S0 repair contracts and failure baseline](../hero-reference/repairs/s0/contracts/README.md) — orientation
- [D009 S1 — physical progress and ordinary DOM state](../hero-reference/repairs/s1/README.md) — orientation
- [D011 S2 shared-frame and clock repair](../hero-reference/repairs/s2/README.md) — orientation
- [D013 S3 acceptance packet — route consumers, depth, and proxy hygiene](../hero-reference/repairs/s3/README.md) — orientation
- [D018 S5 profile and Canvas sizing repair](../hero-reference/repairs/s5/README.md) — orientation
- [D048 S7 status — accepted within bounded repair scope](../hero-reference/repairs/s7/status.md) — current-status
- [D056 Pegasoft Solutions — Brand direction v1](../pegasoft-brand/brand-direction-v1.md) — orientation
- [D058 Pegasoft Hero Baseline Plan](../pegasoft-hero-baseline-plan.md) — orientation
- [D059 Vectr Hero Motion Map](../vectr-hero-motion-map.md) — orientation

## Current usage snapshot

Total recorded tokens: **501,834,379** across **93** local sessions. The estimates below are not billing.

| Model | Sessions | Tokens | P50/session | P95/session | Estimated credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| gpt-6-astra | 9 | 183,629,005 | 22,376,653 | 35,533,457 | 7349.42 |
| codex-auto-review | 36 | 8,104,823 | 113,739 | 977,336 | n/a |
| gpt-5.6-terra | 6 | 21,662,074 | 1,917,859 | 5,750,940 | n/a |
| gpt-5.6-sol | 13 | 93,740,212 | 3,988,867 | 18,279,947 | n/a |
| gpt-5.6-luna | 26 | 192,531,672 | 984,876 | 26,395,820 | n/a |
| gpt-6-luna | 3 | 2,166,593 | 717,157 | 717,157 | 2.42 |

## Retrieval rules

- Prefer the canonical links above and the generated `document-index.json`.
- Use `tier: historical` for chronology and prior decisions; do not treat it as current status.
- Use `tier: raw-evidence` only to verify a claim or reproduce a result.
- Current status and acceptance come from [CURRENT.md](./CURRENT.md) and the baseline plan; historical S7 results do not override them.
- Usage metrics contain counts and metadata only; no raw conversation content is exported.

## Live dashboard

Open [usage-dashboard.html](./usage-dashboard.html). It reloads the generated ledger every 30 seconds and shows model percentiles, token mix, estimated credits, and actionable efficiency feedback.
