# Pegasoft documentation ledger

Document routing aligned: 2026-10-14. Read [CURRENT.md](./CURRENT.md), then the
active task in the [baseline plan](../pegasoft-hero-baseline-plan.md). The plan
alone controls phase status, authorization and acceptance.

## Entry points

- [Baseline plan](../pegasoft-hero-baseline-plan.md) — current authority and maintenance gate.
- [Usage policy](../pegasoft-codex-usage-memo.md) — load only the relevant section.
- [Document index](./document-index.json) — discovery; orientations are read on demand.
- [Sprint ledger](../hero-reference/repair-sprint-ledger.json) — retained evidence and current maintenance packet link.

## Historical material

S7/S8 reports and sealed packets retain their dated dispositions; they cannot
change current authorization. Historical checkpoints and raw artifacts are
read only for a specific decision. The [usage dashboard](./usage-dashboard.html)
and [saved usage ledger](./usage-ledger.json) contain the dated 2026-09-28 snapshot,
not live account limits or billing. Rebuild with `node tools/docs/build-ledger.mjs`
only when a full documentation/usage refresh is needed.
