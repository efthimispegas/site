#### Task 2 — independent measurement of the match

**Skills:** Superpowers verification-before-completion; Three.js/source
inspection for projection and rendering semantics. Screenshots support these
checks; source contracts determine the causal inputs.

**Files:** `tools/hero-reference/measurement-contract.mjs`,
`measurement-contract.test.mjs`, `compare-captures.mjs`, and the existing
reference manifests. Modify the e2e `hero-compare` target so comparison consumes
an explicitly selected complete packet without automatically rerunning capture.

**Interfaces:** consume Task 1's complete manifest and existing reference
state/measurement schema. Preserve schema provenance; add CSS/backing/DPR and
clock correspondence to comparison validity. A mismatch in inputs is blocked,
not a visual pass or an unqualified numerical failure.

- [ ] Extend measurement tests: reject mixed run IDs, missing states, wrong
  viewport/backing correspondence, stale input hashes and whole-object identity
  masks. Permit only the agreed glyph/copy identity exclusions.
- [ ] Pin reference/local input correspondence using locked source semantics
  and recording landmarks. Measure silhouette, beam core and halo separately.
- [ ] Run `pnpm nx run @site/pegasoft-e2e:hero-measurement-test`; expect all
  contract tests pass. Run `hero-compare` only on the valid packet and preserve
  the full per-state failures as the ordered visual repair list.

**Task 2 current evidence and rulings:**

- The reviewed [S4 source overlay](./hero-reference/recording-measurement-amendments-v1.json)
  independently verifies 42 leaves in 12 records. Comparison now consumes it
  without changing the base manifest. The [prior comparison](../apps/pegasoft-e2e/test-output/hero-reference/runs/4c1c48b5-98a6-4a61-9ecf-02a503e7f27f/comparisons/b6a91fb5-1a4d-4976-be23-a0d4448d42af/comparison-report.json)
  remains historical; use the current recovery checkpoint for latest outcomes.
- Loader correspondence is implemented in `measurement-contract.mjs` and
  `compare-captures.mjs`. `qualification-contract.json#loaderPhaseContracts`
  requires independent source/local animation-onset evidence, age intervals
  no wider than one recording frame, overlapping ages, and matching
  run/state/recording/reference/local image pins. Missing correspondence blocks
  structural qualification while retaining numerical failures as diagnostics.
- Ruling: use animation-onset age, never infer navigation age from MOV seek.
  The recording begins on a settled page before reload; CSS and a two-second
  seek cannot prove source age. No guessed .8s offset or identity mask for arc
  differences. Cost: loader metrics remain unqualified until onset evidence exists.
- [Locked loader CSS](./hero-reference/live/locked-reference-loader.css), SHA256
  `cc1ac4c193d083000320123bad183188ced2a082819dbd3a615dbad00ed5700c`,
  confirms 1.5s logo rotation, staged cube/arrow assembly and ellipse erasure
  absent from current local CSS. Qualify timing before comparing these effects.
- Clipped activation/arrival landmarks and non-equivalent route core/glow
  predicates remain blocked; do not widen support or infer physical radius from
  pixel area. Actual route `headWorld` is local buffer space: qualify mesh
  matrix/transform before asserting world coordinates. Roboto findings remain
  unsuppressed pending actual reference-font verification.

**Next:** obtain independently reviewable source/local loader onset for the
existing anchors, then qualify clipped landmarks and core/halo extraction.
No new capture or runtime geometry/surface edit occurred in the latest batch;
Task 3 cannot consume blocked metrics.

