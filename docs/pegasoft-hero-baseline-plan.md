# Pegasoft Hero Baseline Plan

Status: Baseline Phase 15 is accepted; Phase 16 is blocked on measurement correspondence; Phase 2 is deferred open
Last reviewed: 2026-10-08

This document is the sole live authority for Pegasoft hero status, phase
authorization, implementation scope, and next action. The sprint breakdowns,
status notes, manifests, and reviews under `docs/hero-reference/` are retained
evidence or historical consumers; they must not publish a competing current
status. Update this plan first when the live disposition changes.

When updating checkpoints, merge new findings into the current recovery state
and owning task; replace superseded claims rather than append dated narratives.
Keep unique decisions, scope limits, blockers, check outcomes and evidence links.
Move detailed superseded history to supporting records with explicit historical
status. Routine resumption reads [CURRENT.md](./ledger/CURRENT.md), then the active task;
load history only when a specific decision requires it.

## Outcome and audit verdict

Match the Vectr hero's visible composition, motion, interactions, and overall
experience, with A-grade graphics throughout the journey. Retain the agreed
Pegasoft identity/copy and intentional accessibility alternatives. These are
specific product exceptions, not permission to approximate the reference scene.

“100%” means no visible or behavioral difference remains outside those approved
exceptions. Explaining a difference does not accept it. Numerical tolerances
are diagnostic ceilings, not a license for visible errors or a percentage of
completion. Final acceptance requires the user's visual review of normal
playback, not just isolated screenshots or passing tests.

The [foundation audit](./hero-reference/foundation-audit-2026-09-15.md)
reopens overbroad acceptance claims from Phases 1–7. It preserves the source
knots the user accepted, the recording/evidence work, and the legacy cleanup.
It does not accept the implementation built around those facts.

The following table records the 2026-09-15 audit disposition only. Current
phase status is maintained in the canonical tracker below.

| Phase | Audit disposition                                         | What survives / what must change                                                                                         |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 0     | Accepted                                                  | Recoverable Git history and hash-locked recording.                                                                       |
| 1     | Partially reopened                                        | Source anchors survive; route classification, motion evidence, source semantics, and disputed compensations need repair. |
| 2     | Development smoke retained; safety gate incomplete        | Historical browser passes do not prove production startup, actual Canvas failure, context loss, or readiness.            |
| 3     | Accepted for legacy removal                               | No old renderer was found in the audited source. Recheck the production graph at final cutover.                          |
| 4     | Accepted for scoped hygiene                               | Scoped CSS/dependency ownership survives. New compensating rules are still subject to removal.                           |
| 5     | Reopened                                                  | Module separation survives; frame-state ownership and rendered-motion convergence are not proven.                        |
| 6     | Reopened                                                  | Direct-state DOM bounds survive as measurements, not normal-scroll/lifecycle/visible-text acceptance.                    |
| 7     | Source knots accepted; consumer/projection gates reopened | Source roles, idle geometry, depth, physical widths, proxy assumptions, and rendered consistency need correction.        |
| 8–19  | Not accepted                                              | No final camera, scene, motion, graphics, responsive, accessibility, or performance phase is accepted.                   |

Latest stored comparison is run
`a779ce20-e41c-44f8-845a-50d9cda9ddea`, completed
`2026-09-15T10:41:49.978Z`: structural states
`0 pass / 15 fail / 0 blocked`, route checks `14 pass / 70 fail`,
DOM states `13 pass / 0 fail / 2 N/A`. These are historical measurements of
the candidate, not new audit acceptance. All 42 app unit tests passed during
the audit; they do not detect several confirmed defects.

The pre-audit plan is preserved in Git at `f47854d`. Its checkpoint claims
are historical, not a second active plan.

## Canonical baseline-phase tracker

This is the only progress tracker. R3/R4/S0–S8 are execution labels and
evidence groupings; they do not create additional completion criteria or
parallel status. A phase changes status only when its baseline acceptance
evidence is complete.

Use the exact phase definitions under “Phased execution and stop/go gates”.
`Accepted` means that phase's gate is evidenced; `Partially accepted` means
only its stated subset is accepted; `Open` means work or acceptance remains;
`Blocked` means a named failing check/dependency prevents closure; `Not started`
means final phase qualification has not begun. Earlier spot checks still count
as evidence. User authorization to advance and completion of a visual review
are recorded separately from acceptance; neither silently closes a phase.

| Baseline phase | Status | Current disposition / next action |
| --- | --- | --- |
| 0 | Accepted | Preserve recoverable history and hash-locked source evidence. |
| 1 | Partially accepted | Repair outstanding source/motion correspondence before closure. |
| 2 | Open | Current-page and production safety: established Chrome development suite 16/16 passed in [current evidence](#retained-phase-evidence); maintenance technical checks pass under the gate below. Deferred baseline acceptance remains open; maintenance does not close Phase 2. |
| 3 | Accepted | Recheck the production graph at final cutover. |
| 4 | Accepted | Keep new compensating rules subject to scoped hygiene review. |
| 5 | Accepted | Architecture and deterministic rendered state: retained foundation evidence plus physical-scroll/applied-frame named-state reconciliation passed. |
| 6 | Open | Prove normal-scroll/lifecycle/visible-text behavior beyond direct-state measurements. |
| 7 | Open | Close consumer/projection, depth, width, proxy, and rendered-consistency gates. |
| 8 | Open | Constrained camera and geometry anchors across all scene slices; retain measured source projection and verify neighboring motion. |
| 9 | Open | Continuous camera behavior: verify damping, turns, contacts, pointer displacement and slow/fast/reverse trajectories. |
| 10 | Open | Loader, reveal, and landing graphics: review completed with observations retained; no complete gate evidence yet. |
| 11 | Open | Activation: industrial geometry, red feeders, contact and handoff; review observations remain deferred as directed. |
| 12 | Open | Clearance and pointer trail: blue travel, surrounding context and pointer response; review completed with observations retained. |
| 13 | Open | Field approach, contact, and pulse: user completed review with no new observations; full gate acceptance is not recorded. |
| 14 | Open | Arrival and exit: cyan feed, arrow, retreat and DOM handoff; user completed review with no new observations; full gate acceptance is not recorded. |
| 15 | Accepted | Full desktop integration: the user-defined normal, slow, fast, and reverse completion set passed. Phase 2 remains a separate deferred open item. |
| 16 | Blocked | Named telemetry verified; saved 2026-10-01 packet passed capture/provenance 15/15 for its prior inputs. Current telemetry needs a new packet. Source loader age, clipped-landmark, core/halo and exit-boundary correspondence remain unqualified. |
| 17 | Not started | Run responsive qualification after Phases 15–16 are accepted. |
| 18 | Not started | Run accessibility qualification after the accepted compositions are available. |
| 19 | Not started | Run performance, hygiene, provenance, and final personal acceptance. |

Current next action: complete [Task 2 correspondence](#task-2--independent-measurement-of-the-match),
then Tasks 3–6 in order. Phases 15–19 are authorized; no new capture batch is
authorized by this status summary. Phase 2 visual qualification remains
deferred. The separately authorized maintenance batch may repair and verify
lifecycle failures. Failures retain one owning phase; dependent phases link to it.

### Branch maintenance gate

- Maintenance merge with master `d8b950b` is completed on
  `codex/hero-reference-rebaseline`, from hero parent `61bb7b8`.
  Stop maintenance work here; no push or deployment is authorized.
- Required technical checks pass: frozen install, both builds, workspace
  typechecks/lint/unit tests, hero harnesses, complete E2E, production smoke,
  security policy and both production localhost apps. See the
  [final verification packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/master-merge-final-20261014/verification.json).
  These checks do not accept hero visuals or close deferred phase gates.
- The user approved a temporary exception for only `CVE-2026-93687`
  (`braces`, GHSA-vfj7-8cjw-p6xm) on 2026-10-14. Keep the exception in
  `package.json#pnpm.auditConfig.ignoreCves`; review by 2026-10-28 or upon an
  upstream fix. Remove it when a compatible fixed version is adopted.
- Keep `pnpm audit --audit-level high` for every other advisory. The unfiltered
  audit still reports one high finding and one moderate `uuid` finding;
  production dependency audit reports zero. Do not describe the waived issue
  as fixed. Retain the raw audit and explicit user approval in the final packet.
- Unused Next lint registrations/config packages are removed; all 70 active
  rules in each app remain identical. Keep assertions, timing limits and
  provenance requirements intact.
- The [Oct 8 checkpoint](../.superpowers/sdd/pegasoft-hero-baseline-plan/master-merge-repair-20261008/verification.json)
  and [Oct 6 baseline](../.superpowers/sdd/pegasoft-hero-baseline-plan/master-merge-20261006/verification.json)
  are retained historical evidence. Preserve `.env` locally/ignored, frozen
  evidence and the separate `codex/pegasoft-concept` work.

### Current recovery checkpoint

The consolidated operational status, latest checks, packet/report links,
blockers and resume action live in [ledger/CURRENT.md](./ledger/CURRENT.md).
Read it first, then [Task 2's contracts and rulings](#task-2--independent-measurement-of-the-match).
This plan retains the authoritative phase tracker and execution requirements;
CURRENT.md does not add or override acceptance or authorization gates.

## Failed-state audit and reference-quality recovery plan

### Audit — 2026-09-30

Scope: inspect the saved nine failure traces and their owning code; propose
repairs without changing runtime code or running another capture. The failed
packet is evidence of capture failure, not nine demonstrated visual mismatches.
The six passing states establish capture readiness only, not reference fidelity.

| Failed states | Evidence and diagnosis | Required repair |
| --- | --- | --- |
| `loader-mark`, `world-reveal` | Trace snapshots contain a canvas and the requested lifecycle state. Sequential assertions continue after the lifecycle changes, invalidating the state-scoped locator. The reveal trace also contains seed `43117` before the later missing-element failure. | Observe lifecycle, readiness and completed rendering atomically within the actual event window. |
| `landing`, `landing-idle` | Last snapshots remain at reveal and landing respectively. Real lifecycle milestones are 3200/4800/6500ms; `__heroTime` does not freeze those clocks. | Coordinate test input time with resource readiness and normal lifecycle advancement. Do not increase assertion timeouts as the fix. |
| `clearance-field-preview`, `field-contact`, `journey-exit` | Final trace snapshots contain the requested state, direct entry and render readiness, after acquisition failed. Preview appears about 88ms after the count assertion ends. | Instrument navigation, hydration, measurement and completed-frame timestamps to isolate the entry race; permanent unreachable states are not established. |
| `field-pulse-a`, `field-pulse-b` | DOM labels stay at field contact. Controller `fieldPulseMs` is zero, while the normal rendered-frame owner advances the actual pulse clock separately. | Capture the applied frame's pulse age and consumer acknowledgments. This is a confirmed diagnostic disconnect, not proof that visible pulses are absent. |

**Artifact defect:** `hero-reference.visual.ts` clears output and creates a run
ID in worker `beforeAll`. A worker restart after failure deletes earlier images
and changes provenance. `afterAll` produces a manifest only if that worker has
all 15 states. Move initialization/finalization to run scope; retain explicit
failed-state records and every completed artifact.

**Retained audit correction:** the loader canvas requirement was
a provisional suspicion. The traces show a canvas during loader-mark; removing
that requirement or inventing a separate loader surface is not justified.
The audit supersedes that inference while retaining the historical checkpoint.

**Remaining visual uncertainty:** the current five-landmark composition,
industrial details, cool fill and ground falloff are candidates. Pale reflective
surfaces, facade relief, reflections, haze, beam core/halo balance and continuous
camera/contact behavior remain unaccepted. No new numerical comparison or
normal-playback acceptance was produced by this audit. Screenshot DPR `2` and
canvas backing scale `1.75` are distinct measurements and must be recorded.

### Reference-quality recovery implementation plan

> **For the executing owner:** use `superpowers:executing-plans` task by task.
> Keep one owner for this dependent sequence. Review this proposed plan before
> implementation; preserve historical evidence and unrelated working changes.

**Goal:** deliver the reference's composition, graphics and motion quality,
with only the approved Pegasoft identity/copy and accessibility exceptions.

**Architecture:** physical input and the existing rendered-frame owner remain
the source of output. Test transport controls input/time and observes completed
frames; it never assigns expected scene output. Geometry, surfaces and motion
are qualified separately before responsive and final product review.

**Tech stack:** Nx/pnpm, Next.js/React, React Three Fiber/Three.js, Playwright,
existing Node measurement and evidence tools.

**Spec:** this plan's source contracts, Accuracy and acceptance contract, and
Phases 16–19; locked reference recording/source evidence and the linked
Impeccable critique are supporting inputs.

#### Global constraints

- A visible mismatch fails even when a metric passes. Retain every ceiling in
  the Accuracy and acceptance contract without widening masks or tolerances.
- Keep original implementation assets, approved copy/identity, normal physical
  input, shared frame ownership and completed-render consumer consistency.
- No query-forced expected output, fabricated clock/state, weakened assertions,
  production test transport, automatic retry loop or broadened Phase 2 work.
- Preserve the 336/336 historical packet and its 24 predeclared N/A cells;
  rerun affected checks and mandatory phase gates against current inputs.
- Daily five-hour usage pauses at 95%; weekly usage is not this user gate.
  Obtain capture authorization for a new bounded batch; the prior one is spent.
- Do not merge, publish or claim final acceptance before the complete packet
  and the user's normal-playback review. Stop after three failed repair passes
  on the same blocker and checkpoint its evidence.

#### Review focus

1. Slow resources must not make timed capture observe a different lifecycle.
2. A failed test/worker restart must preserve successful images and run identity.
3. Fast/reverse scroll must retain local clock causality and frame consistency.
4. Fractional backing scale and alternate viewport must preserve visible detail.
5. Reduced motion or context loss must leave readable, usable content.

#### Task 1 — trustworthy capture and preserved evidence

**Skills:** Superpowers systematic-debugging and verification-before-completion;
Nx workspace/run tasks. Reuse the existing S7 atomic observation pattern.

**Files:** modify `apps/pegasoft-e2e/src/visual/hero-reference.visual.ts`,
`apps/pegasoft-e2e/playwright.visual.config.ts` and
`apps/pegasoft-e2e/project.json`; create
`apps/pegasoft-e2e/src/visual/hero-capture-contract.ts`,
`hero-capture-contract.spec.ts`, and `hero-capture-global-setup.ts` in that
directory. Change development diagnostics only if an applied-frame observation
cannot be obtained from its existing record; do not alter production clocks.

**Interfaces:** `CaptureRunContext` owns `runId`, `outputRoot`, `startedAt`,
`buildId`, `inputTreeSha256`. `CaptureObservation` contains `requestedKey`,
actual lifecycle, the existing completed frame record, applied consumer IDs,
CSS viewport, screenshot DPR, backing dimensions and timestamped input log.
`waitForCaptureObservation(page: Page, key: ReferenceStateKey):
Promise<CaptureObservation>` consumes existing state definitions and checks
actual lifecycle/progress/local elapsed time together. Global setup creates one
run context; worker code reads it and never clears another worker's output.

- [x] Add regression cases `lifecycle_changes_between_assertions`,
  `resource_readiness_delays_entry`, `pulse_label_differs_from_applied_clock`,
  `stale_consumer_rejects_frame`, and `restart_preserves_run_artifacts`.
  Assert one completed frame, matching consumer frame IDs, real pulse age,
  unchanged run ID and retained earlier image; a partial run is marked failed.
- [x] Register a focused Nx target for these contract tests and demonstrate the
  relevant failure before implementation. Keep browser cases in a separate
  spec/config from artifact-only tests so they cannot initialize a capture run.
- [x] Implement run-scoped artifact ownership and atomic observation. Install
  supported browser clock transport before navigation where lifecycle timing
  requires it; coordinate it with ordinary render advancement. Confirm the
  installed Playwright clock API before coding. The current frame driver alone
  does not freeze wall-clock lifecycle timers. Log every input/time advance.
- [x] Run the focused Nx contract target: all named regressions pass. Preview
  the diff, then request one bounded diagnostics-production capture batch.
  Expect 15 complete observations with intact metadata, or a preserved explicit
  failed manifest. Do not compare partial evidence or silently rerun capture.

Task 1 verification: run `31515db9-ab30-430e-9721-669be939d945` completed 15/15 captures with one immutable manifest and artifact hashes. Focused contracts passed 20/20, native CSS clock checks 4/4, app tests 238/238, and both typechecks passed. Contact clock follows the actual rendered history above .72; no zero-age contact was fabricated. This proves capture acquisition only. Task 2 is active: strict provenance production and independent correspondence remain required before geometry qualification.

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

- [x] Extend measurement tests: reject mixed run IDs, missing states, wrong
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
- Local age must now include the captured native `currentTime` of exactly one
  reviewer-identified CSS animation (`implementation.animationId`); absent,
  duplicate, transition-only or conflicting readings block qualification.
  Three regressions were observed RED→GREEN; measurement suite **57/57**.
  Current saved native animation IDs 0/1 read **2016.666ms** at loader-mark
  and **3500ms** at world-reveal; they have no retained target/name binding.
- Named telemetry checkpoint: native CSS animation names/transition properties,
  target identity/unique capture-time selectors, pseudo-elements and JSON-safe
  authored timing are implemented. Comparison requires matching native name/target
  and reviewed equivalent source/local effect roles. **6/6** clock fixtures,
  **59/59** measurement contracts, **28/28** capture contracts, both typechecks
  and lint pass (**0 errors/39 warnings**); five regression cases observed RED→GREEN.
  The [source-onset evidence contract](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-loader-onset-evidence-contract.json)
  remains unfilled, with source ages null. This implements evidence collection,
  not source-onset or visual qualification.
- Retained-recording rotation probe: **52** thresholded cube observations across
  **18** frames yield conditional onset estimates spanning **106.93ms**, versus
  the **16.67ms** gate. This sensitivity range is not a certified uncertainty
  bound: authored cube geometry, effect identity, raster error and recording/CSS
  equivalence remain unproven. **3/3** input hashes and **52/52** row hashes
  verify; **43** decoded center crops and reproducible analysis are retained in
  [the probe checkpoint](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-rotation-probe/checkpoint.json).
  No onset contract or capture offset was populated. Next pin recording-matched
  effect geometry and validate estimator error before independent qualification.
  No new reference capture or runtime edit; Task 2 remains blocked.
- Authored geometry checkpoint: retrieved HTML **25201 bytes** exactly matches
  the locked audit hash. Its SVG pins `cube_01`'s axis-aligned path, zero-delay
  fade/slide and parent `logo-rotate`. A recorded assembled-logo frame measures
  center offset **4.5–5px right / 6px down** from the crop center; using that
  diagnostic placement leaves **0.48–7.93px** positional residual across **48**
  conditional rows. **6/6** artifact hashes and reproducible analyses verify;
  [geometry manifest](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-rotation-probe/source-geometry-manifest.json)
  pins source bytes, SVG, frame and methods. HTML hash equality establishes the
  audited source version, not the recording's native computed style or timing.
  Next validate a conservative raster estimator error bound. No new visual
  capture batch, runtime edit or phase qualification.
- Geometry-based raster estimator checkpoint: **18/18** independent forward-rendered
  synthetic poses recover within the stated **0.25° / 0.25px** validation
  tolerances; **16/16** recording frame hashes match. Recorded conditional
  onset estimates span **19.33ms**, exceeding **16.67ms** before any error
  allowance. Maximum normalized recording residual **0.253** exceeds the tested
  synthetic envelope **0.067**. Both qualification checks **fail**; synthetic
  recovery supplies no conservative recorded-codec error bound. The
  [estimator manifest](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-rotation-probe/raster-fit-manifest.json)
  retains algorithms, synthetic truths, per-frame fits and residual previews.
  Background onset, threshold moments and direct geometry fitting are three
  insufficient source-onset approaches; stop retries on this evidence per the
  three-pass rule. No onset contract, capture offset or acceptance was assigned.
- Telemetry changes the capture input tree. Current comparison correctly rejects
  the saved anonymous packet before metrics; its report below is historical for
  its recorded inputs. Original clock source/tests are retained and match the
  captured hashes. Checks, failure logs and source-resolution pins:
  `repair-sprint-ledger.json#recoveryTask2.namedTelemetryCheckpoint`. No new
  reference capture or runtime geometry/surface edit ran in this batch.
- Authorized 2026-10-01 packet `4cbfe8c6-b763-444d-a84b-2d5301969fd6`
  captures **15/15**, passes **62/62** manifest artifact bytes/hash checks and
  **15/15** strict provenance. Full tracked diff bytes and the preflight identity
  are retained; all state pins match both preflight and current WIP. The old
  packet and its tracked-diff mismatch remain historical, with no backfilled pins.
  Records: `repair-sprint-ledger.json#recoveryTask2`.
- [Retained pre-instrumentation comparison](../apps/pegasoft-e2e/test-output/hero-reference/runs/4cbfe8c6-b763-444d-a84b-2d5301969fd6/comparisons/040854b4-8609-4319-8d88-ee708c76406c/comparison-report.json)
  exits **1**: structural **8 fail/7 blocked**, raster diagnostic **15 fail**,
  DOM **10 pass/3 fail/2 N/A**. Nx measurement **57/57** and both capture
  typechecks pass (app typecheck cache hit). The sandbox server-start failure
  is retained; the permitted capture passed. No geometry/surface edit or visual acceptance.
- Source-only extraction from the existing MOV places the visible page-to-loader
  presentation change between decoded frames 56/57 (PTS 5800/5900, time base
  1/6000; 0.966667–0.983333s). Full-resolution frames, timestamp metadata and
  hashes are retained in `repair-sprint-ledger.json#recoveryTask2.sourceOnsetCandidate`.
  The [independent loader review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-loader-independent-review.json)
  verifies the packet plus **20 linked hashes**, **4/4** byte-identical recording
  frame re-decodes and **2/2** clock agreements. All three qualification questions
  are **blocked**: these frames establish background presentation only, not
  effect-specific animation onset; anonymous native IDs cannot establish semantic
  correspondence, and equivalent source/local age overlap is unproven. Do not
  populate phase contracts or guess capture offsets. Review and packet hashes
  are pinned in `repair-sprint-ledger.json#recoveryTask2.loaderQualificationReview`.
- Ruling: use animation-onset age, never infer navigation age from MOV seek.
  The recording begins on a settled page before reload; CSS and a two-second
  seek cannot prove source age. No guessed .8s offset or identity mask for arc
  differences. Cost: loader metrics remain unqualified until onset evidence exists.
- [Locked loader CSS](./hero-reference/live/locked-reference-loader.css), SHA256
  `cc1ac4c193d083000320123bad183188ced2a082819dbd3a615dbad00ed5700c`,
  confirms 1.5s logo rotation, staged cube/arrow assembly and ellipse erasure
  absent from current local CSS. Qualify timing before comparing these effects.
- Activation/arrival landmark support audit reproduces **3/3** historical
  local selections/quality reports and verifies **3/3** local image pins,
  **3/3** source-only mask pins and **6/6** source-frame/overlay pins. The pale
  neutral predicate admits background at **11/12** ROI corners. Dominant
  components span each entire ROI and fail unchanged size gates; selected
  residuals are **5139 / 1695 / 0** pixels. Boundary contact by these residuals
  does not prove the intended building/arrow is clipped. The
  [audit manifest](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-audit/manifest.json)
  retains component rejection evidence, unchanged extractor snapshot and
  foreground/background validation challenges. Silhouettes remain unqualified.
  Non-equivalent route core/glow predicates also remain blocked; do not widen
  support or infer physical radius from pixel area. Actual route `headWorld` is local buffer space: qualify mesh
  matrix/transform before asserting world coordinates. Roboto findings remain
  unsuppressed pending actual reference-font verification.

- Background-separated extractor candidate (2026-10-02): a new helper uses
  dominant border-color calibration, an explicit uncertainty band and enclosed
  interior fill. Original classifiers, ROIs and support/geometry gates remain
  unchanged; active capture/comparison does not use the candidate. **67/67**
  measurement contracts, **28/28** isolated capture fixtures, both typechecks
  and lint (**0 errors/39 warnings**) pass. Seven missing-behavior/palette/hole
  regression cases were observed RED→GREEN; the exterior-notch case stays green.
  **11/11** saved negative samples are excluded. Filled candidate support is
  **188869 / 171906 / 33392** pixels: activation support clears color/extent
  gates, while arrival still reaches the fixed ROI boundary. Every semantic
  qualification remains **blocked**. The complete
  [review packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor/review-packet.json)
  pins 12 inputs and 20 artifacts, including unmasked frames, source-only goals,
  candidate masks, patch and explicit checks. No reference capture, source-mask
  borrowing, geometry edit or acceptance was performed.

- [Independent landmark review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-background-extractor/independent-review.json)
  completed: **32/32** linked hashes/sizes and all three saved mask counts verify.
  Activation-route's intended building is corroborated for its pinned historical
  raster only; boundary accuracy, current provenance and structural acceptance
  remain unqualified. Contact contains connected red-rail fringes; arrival
  touches the unchanged ROI edge. Both remain blocked. Two P2 findings retain
  connected contamination and the absence of a calibrated contour-error bound.
  Saved measurement/typecheck/lint logs were checked; fixture and whitespace
  passes are recorded without linked raw logs for independent verification.

**Parallel evidence checkpoint (2026-10-02):** all three authorized lanes
completed; root reran their diagnostic verification. [Landmarks](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/landmarks/outcome.json)
verify 21 pins, three identical masks and two byte-identical runs. The contact
fringe connects to building support; arrival's ROI edge selects a bright feed
endpoint, while the gray shaft begins around raster x1220. Boundary contact
therefore does not establish shaft clipping. Edge-local uncertainty and enclosed
fill are accounted for, but contour-error calibration remains absent.
[Beam](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/beam/outcome.json)
verifies 30 pins and 11 reproducible outputs: all 16 tested halo corner samples
admit background, and the source bright peak fails its core predicate. Profile
widths remain diagnostic, not qualified thickness or physical radius.
[Exit](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-parallel/exit/outcome.json)
verifies 14 pins and three reproducible outputs; local contrast 16.366 < 20 and
dominance 1.998 < 3 retain the blocker. The 2.932 CSS px boundary delta cannot
serve as accepted geometry. Shared code and the prior 32 candidate pins remain
unchanged; no captures or runtime edits ran. Evidence producers cannot review
their own output.

**Implementation/check/evidence checkpoint (2026-10-02):** landmark ambiguity
veto and inactive beam/exit profile diagnostics are implemented and packaged.
The [landmark packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-candidate-refinement/review-packet.json)
has 41 verified entries using immutable snapshots; its
[independent review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-landmark-candidate-refinement/independent-review.json)
accepts the bounded veto with no implementation findings. Contact's 103 red-adjacent
contour pixels and arrival's 29 ROI-edge pixels/25 external continuation witnesses
remain blocked; diagnostic masks/interiors are unchanged. No clean separation
or contour-error bound is claimed. BEFORE/AFTER snapshots preserve old pins.
The [profile packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-profile-diagnostics/review-packet.json)
historically verified 31 pins and two byte-repeatable outputs; immutable BEFORE
snapshots preserve its original source/test inputs. It retains raw RGB, sideband
noise, declared threshold sensitivity and unchanged exit gates. Applied crop/opacity
remain unavailable without same-frame consumer readback. The initial review found
one P2: bright peaks joined by a dim bridge evade rejection. The
[refinement packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-profile-ambiguity-refinement/review-packet.json)
verifies **35 pins/three repeatable outputs**. Its literal fixture failed before
correction and now blocks; a single flat plateau and four historical beam/two exit
results are preserved. The
[targeted independent re-review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-profile-ambiguity-refinement/independent-review.json)
closes that counterexample with no remaining implementation findings. Higher
connecting support and other semantic ambiguity still require challenges.
Fresh owner measurement contracts **85/85**, both typechecks, lint
**0 errors/39 warnings** and whitespace pass. Original 83 tests remain intact.
Diagnostic review grants no measurement or geometry qualification. No active
integration, source-mask borrowing, runtime edit or new capture ran.

**Task 2 remains blocked:** the [closure packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-closure/closure-packet.json)
and [evidence inventory](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-closure/manifest.json)
retain five unresolved gates: loader age, semantic contours/error, core/halo,
exit correspondence and matching current capture/ordered comparison. The
user-requested [loader log search](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-closure/loader-log-search.json)
checked 70 saved logs (72 pinned inputs): loader packets/local clock logs exist,
but no original recording-session animation-start telemetry was found. Two source
ages remain unfilled. The historical capture's clock source/spec hashes differ
from current inputs; never backfill them.

**Next:** source authority is blocked. The user confirms no other original-session
trace exists. The [novel-method feasibility packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-loader-method-feasibility/manifest.json)
verifies ten pins; its [independent review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-loader-method-feasibility/independent-review.json)
corroborates **no proceed on retained evidence**, including staggered-event
constraints. Missing original effect binding, visibility latency and compatible
recording-error bounds prevent a certified one-frame onset interval. This is an
evidence-specific barrier, not a universal impossibility theorem. Do not perform
a fourth fit or backfill ages. A synchronized replacement reference requires
explicit source-authority and capture authorization; it cannot retrospectively
qualify the original MOV. The concrete protocol and acceptance limits are in
`repair-sprint-ledger.json#recoveryTask2.referenceAuthorityDecision`.
The [full-route beam packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-beam-full-route-qualification/review-packet.json)
verifies 40 pins/15 repeatable outputs across six rasters/27 sections. Its
[independent review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-beam-full-route-qualification/independent-review.json)
accepts the challenge/feasibility conclusions only. Dark red, dot/copy and
unavailable/pulse coverage remain unqualified; require semantic/orientation/error
labels and validated attribution for separate core/halo claims. Preserve all
silhouette/core/halo/exit/current-capture gates. Task 3 cannot consume blocked
metrics. The readback packet is checked and independently reviewed; the next
action is the pending source-authority decision.

**Implementation order confirmed (2026-10-03):** the user selected full Task 2
qualification before hero-world implementation. The written specification is this
plan and its locked source/acceptance contracts; no separate spec phase is declared.
Close all five Task 2 gates and obtain the ordered valid comparison before Task 3.
Carry later phase and personal visual-acceptance gates into implementation; do not
carry unresolved Task 2 gates past this entry condition. Autonomous qualification
work is authorized until Task 2 completes or five-hour usage reaches 95% (5%
remaining), preserving the stop on insufficient loader reconstruction methods.
The [independent local witness packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-independent-landmark-labels/manifest.json)
verifies 13 pins/three repeatable outputs, but complete contours and calibrated
error remain blocked: contact fringe and arrival endpoint/shaft ownership require
independently identified same-frame layer/coverage evidence. Prior candidate
exposure is disclosed; this is not first-exposure blinded labeling. Full-route
beam challenges and loader feasibility are independently reviewed as above.
Current canvas presentation readback is implemented and checked: 43/43 capture
contracts, 85/85 measurement contracts, both typechecks and lint (0 errors/39
existing warnings). The [52-pin packet](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-exit-presentation-readback/review-packet.json)
passes [independent review](../.superpowers/sdd/pegasoft-hero-baseline-plan/task2-exit-presentation-readback/independent-review.json),
including the corrected strict/content paint-containment barrier (RED 41 pass/2
fail, GREEN 43/43). It retains conservative same-task DOM clipping and
ancestor CSS opacity plus initial/before/after screenshot parity; unsupported or
animated presentation blocks quantities. This does not certify world crop planes,
composited opacity, screenshot exposure or continuous forward/reverse exit.
No current hero capture ran; all five qualification gates remain open.
No runtime geometry work has started.

#### Task 3 — opening and activation geometry

**Skills:** `3d-web-experience`, `threejs-skills`, then Impeccable polish for
composition finish. Read their applicable mesh, camera and material guidance
at execution; do not substitute screenshot-based repositioning for geometry.

**Files:** `stages/landing-graphics.tsx`, `stages/activation.tsx`,
`stages/primitives.tsx` under the existing hero-scene directory.
**Interfaces:** retain current scene progress/frame consumers and constrained
camera. Produce original meshes with measured silhouette/depth/contact anchors.

- [ ] Turn the Task 2 geometry failures into per-landmark assertions using
  center `0.75%`, size `2%`, primary IoU `0.90`, secondary IoU `0.85`.
- [ ] Preview and implement silhouette/roof/facade/depth corrections one
  landmark group at a time. Preserve continuous forward/reverse visibility and
  verify that nearby context does not cover copy or contact anchors.
- [ ] Run affected Nx checks and recapture only affected observations under
  the approved batch. Deliver opening-to-contact normal playback plus overlays;
  accept this geometry slice before tuning shared light to hide discrepancies.

#### Task 4 — surfaces, reflections, light and beam finish

**Skills:** Three.js materials/lighting/shaders; Impeccable polish and optimize.
**Files:** `hero-materials.ts`, `hero-lighting.tsx`, `hero-ground-shadow.tsx`,
`hero-beam.tsx`, and the affected stage material assignments.
**Interfaces:** preserve Task 3 geometry and existing beam/frame inputs;
produce surface response and core/halo layers measurable independently.

- [ ] Record matched flat-color, fog/glow, contact-shadow and reflection samples
  before changing materials. Inspect original shader/color-space behavior and
  depth response rather than fitting a global ambient intensity by eye.
- [ ] Preview and implement the measured pale surfaces, facade relief,
  reflections and floor falloff with original shader/material work. Bound any
  reflection/shadow cost; profile before adding a per-frame render pass.
- [ ] Verify flat Delta E 2000 `3`, fog/glow `5`, and beam core thickness
  `1 CSS px` or `10%`, whichever is larger. Check fractional backing scale,
  antialiasing and normal playback; reject visibly wrong surfaces even if
  sampled colors pass. Record frame cost for the same reviewed inputs.

#### Task 5 — continuous motion and remaining scenes

**Skills:** animation-vocabulary/animate for choreography; Three.js camera and
frame ownership; Superpowers debugging for causal timing failures.
**Files:** existing controller/frame-state/frame-owner and their tests,
`stages/clearance.tsx`, `field-match.tsx`, `arrival.tsx`, and the existing
physical-scroll diagnostics specs. Touch shared motion only for measured defects.
**Interfaces:** use the same completed `HeroRenderedFrame` and physical input
log as Task 1. Field/arrival ages come from normal active/reset semantics.

- [ ] Add affected regressions for fast/reverse entry, field-clock reset,
  stale consumer frames and resize/restoration. Assert clocks against source
  causality, not requested pulse labels or arbitrary recording seconds.
- [ ] Repair clearance context/pointer trail, field contact/pulse and arrival
  feed/arrow/retreat in that order; apply Tasks 3–4's geometry/surface method
  to each scene. Keep route endpoints within `0.5%` and centerline Hausdorff
  distance within `0.75%` of the short edge.
- [ ] Run affected Nx frame/diagnostic gates and normal/slow/fast/reverse
  trajectories. Measure projected camera error below `1%` within `450ms`
  desktop, `300ms` mobile; normalized progress residual alone is insufficient.
  Deliver continuous playback with copy/scene handoff evidence, then one
  complete desktop packet to qualify Phase 16.

#### Task 6 — Phases 17–19 and final acceptance

**Skills:** responsive adaptation, accessibility-compliance audit, animation
reduced-motion guidance, Three.js performance/Impeccable optimize, then
Superpowers verification-before-completion and finishing-development-branch.
**Files:** existing responsive profile/shell/controller code, accessibility and
production-smoke specs, performance/evidence harnesses, and this tracker.
**Interfaces:** consume the accepted desktop packet; responsive variants must
be explicit source-derived compositions, not hidden quality reductions.

- [ ] Phase 17: qualify required viewport/input profiles, distinguish viewport,
  coarse-pointer and actual iOS behavior, and check backing scale/detail. Record
  physical-device evidence where required; emulator screenshots cannot replace it.
- [ ] Phase 18: verify keyboard/focus, readable fallback after real context loss,
  and reduced-motion behavior against the existing phase requirements. Rerun
  affected shipping smoke; preserve approved static accessibility alternatives.
- [ ] Phase 19: run mandatory performance/hygiene/provenance checks. Preserve
  LCP `<2.5s`, CLS `<0.1`, p95 frame time `16.7ms` desktop / `33.3ms` mobile,
  and long-task `50ms` ceilings; prove test transport absent from shipping.
- [ ] Assemble the complete matching-input packet before independent review.
  Review once, then only affected findings/regressions. Present normal playback
  for the user's final visual acceptance; only then offer branch integration.

**Review basis:** the failed-state audit supplied the recovery tasks and retained
all thresholds, provenance and phase order. Task 1 is complete; Task 2 is active.
Canvas absence and invisible pulses are not established by those old failures.

### Retained phase evidence

- Phase 2 remains deferred open. Established Chrome development lifecycle
  suite [16/16 passed](./hero-reference/phase-02/2026-09-28-lifecycle-review/results.json)
  at port 4315 with isolated `.next-lifecycle-review` output; this proves neither
  production equivalence nor physical/mobile-device behavior. Bundled Chromium
  148 stopped after three passes: [2/2 failed initially](./hero-reference/phase-02/2026-09-28-lifecycle-review/chromium-before/results.json),
  [remount then passed](./hero-reference/phase-02/2026-09-28-lifecycle-review/chromium-observer/results.json),
  [deadline passed but the next case failed before diagnostics mounted](./hero-reference/phase-02/2026-09-28-lifecycle-review/chromium-final/results.json).
  Observation races were corrected provisionally; no timer/renderer causal fix
  or complete bundled-browser qualification is claimed.
- Phase 5 passed the three failing named-state cases using loader clearance,
  physical wheel input, applied field clocks and same-frame consumer checks;
  one mobile duplicate was intentionally skipped. No expected-output injection.
- Phase 15 accepted the user's reduced desktop set: normal 3.6s, slow 7.2s,
  fast .9s and reverse 3.6s, with physical progression, endpoint convergence and
  completed-consumer consistency. Jump/resize/stationary/restoration checks were
  outside that phase's accepted set, not globally waived.
- Phase 18 remains unqualified. Chrome menu/focus evidence survives;
  default mobile-profile failures remain to be reproduced and diagnosed.

Earlier candidate details, the failed 6/15 acquisition, trace paths and later
corrections are retained in [checkpoint history](./hero-reference/baseline-checkpoint-history-2026-09-30.md).
Task 1's complete immutable packets supersede that acquisition failure.

## Retained repair decisions and historical evidence

S0–S8 are evidence groupings, not additional authorization or completion gates.
The [sprint ledger](./hero-reference/repair-sprint-ledger.json) preserves their
bounded reviews: S6 development lifecycle/DOM scope; S7/S8 336/336 applicable,
24 predeclared N/A, strict provenance, complete handover, independent approval,
and shipping/context-loss smoke 4/4. None establishes final visual fidelity,
production/physical-device equivalence or personal acceptance.

Retain these R1–R4 decisions: derive targets from physical scroll and share one
completed frame across consumers; preserve accepted source knots and reuse
activation feeders for landing idle with normal depth; distinguish world tube
radius, visible core and glow; constrain the source camera/FOV rather than
compensate for geometry; derive responsive/device/backing rules independently;
prove real production Canvas failure and fallback. The failed R3 personal
review remains unaccepted and does not constrain later authorization through
Phase 19. All exact earlier narratives and rulings remain in
[checkpoint history](./hero-reference/baseline-checkpoint-history-2026-09-30.md);
load it only for a specific historical question, not routine resumption.

## Authority and provenance

Only [vectrfl.com](https://www.vectrfl.com/) and the supplied
[recording](./vectrfl_recording.mov) are visual authorities.

Recording identity:

- SHA-256 `de2d5e03a9bb8c1ef93278088f9f205b48710a3ce9568a648b96d619cfaeb321`;
- H.264, `3016×1522`, `1980` frames, nominal `60fps`;
- duration `32.927833s`, size `190835536` bytes.

The recording starts with an already-resolved page before reload. Timestamps
are seek anchors, not animation durations. The
[motion notebook](./vectr-hero-motion-map.md) retains the chronological ladder.

Use live evidence for current input causality and responsive behavior; use the
recording for its immutable desktop appearance and chronology. When they
appear inconsistent, compare physical input, DOM progress, target progress,
rendered progress, local time, pointer, and projection before choosing a
resolution. Record unresolved differences in the
[decision log](./hero-reference/decision-log.json). Do not silently combine
conflicting states or invent a reveal gate to make a selected screenshot fit.

No old scratch asset/path or opaque legacy alias is acceptance evidence.
Extracted frames and local screenshots are reproducible outputs, never new
authorities. Existing code, this plan, and other Markdown documents are not
design evidence. Product constraints remain in
[website-plan.md](./website-plan.md); delivery policy remains in
[pegasoft-codex-usage-memo.md](./pegasoft-codex-usage-memo.md).

Classify claims as observed, source-confirmed, inferred, unknown, or
implementation candidate. Every new run must identify implementation revision
and working diff, source hash/frame or URL/date, run ID, browser/GPU, viewport,
screenshot DPR, actual Canvas backing size, fonts, physical scroll, target and
rendered state, local-effect time, pointer, and entry mode. Emulation is not
physical-device or performance acceptance.

Source semantic masks remain accepted for reference refinement only. They
must not classify localhost pixels or independently confer visual acceptance.

## Accepted source knots — exact scope

The user's acceptance of the source coordinates remains valid:

- Red camera look-at path: `[-50,-35]` to `[-56.1,3]`, with its verified
  intermediate controls. This is not a single visible red trunk.
- Four red activation feeders: their separate source controls and contacts;
  landing idle packets use these same feeder paths.
- Blue route zero and blue route one: verified control sets and contacts;
  scene ranges `0.17–0.74` and `0.74–0.90`.
- Source route elevation and verified red camera range `0–0.17`.
- The 31-sample to 40 equal-distance-point construction applies specifically
  to blue route zero. Other paths retain their own source sampling semantics.

Synthetic route fractions `0.25/0.75` are local API coordinates, not reference
timing. The source blue tube radius is `0.125`; the local `0.035` candidate
is not an accepted source value. Source camera paths, visible line paths,
local frames, and contact events require explicit role-specific consumers,
not an assertion that all consumers must produce identical samples.

Details and source hashes are in
[source evidence](./hero-reference/live/source-evidence.json) and audit A03/A08.

## Architecture and hygiene contract

- One page owner measures physical scroll and layout. Distinct DOM progress
  and scene target derive from that measurement without losing early scroll.
- One render-state owner applies damping and distributes the actual rendered
  progress, camera pose, route/contact samples, and effect gates. No scene
  component independently reads document scroll or uses a different clock
  for the same source-driven motion.
- One camera owner controls projection, pose, and pointer displacement. The
  world root stays fixed unless contradictory live evidence is established.
- Canonical path data is role-specific. Idle and activation share feeders;
  camera paths are not substituted for visible lines.
- Loader, idle packets, field pulses, arrival marks, and ambient scene motion
  have explicit source-backed clocks and reset rules. A stationary screenshot
  does not prove the behavior of a moving or repeating effect.
- Direct capture controls only inputs/time and use the normal renderer.
  Test-only copy/lifecycle overrides cannot prove production behavior.
  “Ready” must mean applied pose/effect state and required resources, not a
  DOM label followed by two animation frames.
- Stage modules own scene content, not global progress, camera, or DOM queries.
  Keep evidence and test controls outside the production runtime graph.
- Capture metadata must not select different production colors or geometry.
  Responsive rules use verified layout/input/device conditions.
- Actual Canvas readiness and failure feed the loader/fallback boundary.
  A separate successful WebGL probe does not prove the rendering context works.
- Maintain one active hero. Delete superseded compensations when their
  replacements are verified. Git is rollback; no dormant legacy renderer.
- Original authored meshes, baked details, instancing, and custom shaders are
  allowed when they improve fidelity and cost. Do not force procedural boxes
  merely because they are present. Do not ship reference assets without
  appropriate authorization.
- Preserve unrelated shared consumers, including legitimate motion-system
  dependencies. Cleanup is scoped, not indiscriminate package deletion.

The existing module separation is useful and should be retained where it
supports these rules. Tests that merely freeze provisional block counts,
maximum dimensions, or a large ground size must be replaced with measured
layout and actual frustum/occlusion coverage tests.

## Accuracy and acceptance contract

A visible mismatch fails even when a metric passes. Retain these screening
ceilings while improving source/local measurement equivalence:

| Measurement                   | Maximum error                                    |
| ----------------------------- | ------------------------------------------------ |
| DOM copy/header/CTA bounds    | `2 CSS px` or `0.25%` of short viewport edge     |
| Primary landmark center       | `0.75%` of viewport width/height                 |
| Primary landmark width/height | `2%`; silhouette IoU at least `0.90`             |
| Secondary context silhouette  | IoU at least `0.85`                              |
| Composition edge centroid     | `0.75%` of viewport width/height                 |
| Route centerline              | Hausdorff distance at most `0.75%` of short edge |
| Route entry/contact/exit      | `0.5%` of viewport width/height                  |
| Route apparent core thickness | `1 CSS px` or `10%`, whichever is larger         |
| Camera-direction / major axes | `1°`                                             |
| Negative-space occupancy      | `3%`                                             |
| Flat solid colors             | Delta E 2000 at most `3`                         |
| Fog/glow samples              | Delta E 2000 at most `5`                         |
| Copy/scene handoff            | `0.005` in the correct measured progress domain  |
| Time-authored loader event    | `50ms`                                           |
| Settled desktop camera        | Under `1%` screen error within `450ms`           |
| Settled mobile camera         | Under `1%` screen error within `300ms`           |

The camera settling rows measure projected screen-space error, not normalized
scene-progress residual. A unit test comparing `abs(target - progress)` with
`0.01` cannot establish either screen-space budget. S2 must preserve the
verified source damping curve and test it against an independent source oracle;
S7 records projected error separately. If the reference itself contradicts a
budget above, retain the observed result and escalate that specific conflict
for plan review instead of speeding up motion to pass a proxy assertion.

Separate acceptance dimensions:

1. Source coverage and classifier validity, including missing context, visible
   beam core/glow, surrounding marks, and intermediate motion.
2. Scene geometry, route, depth, camera, and composition.
3. Normal motion, causality, damping, local clocks, pointer, and lifecycle.
4. Visible typography, wrapping, clipping, opacity, transform, and timing.
   Passing DOM rectangles alone is insufficient.
5. Graphics quality: surface response, shadows, reflection, glow, antialiasing,
   temporal stability, and complete context, not just a 4×4 edge distribution.
6. Responsive/accessibility/performance and final user review.

Keep unmasked images visible. The unmasked raster comparison is diagnostic
while approved Pegasoft glyph differences exist; it must not simultaneously
be called diagnostic and act as an impossible release gate. Any difference
mask must cover only approved glyph/logo pixels, never an entire text box or
scene error. Until a valid mask is available, use explicit scene and text
gates plus visual review; do not report raster acceptance. The comparator
currently needs this repair—it is not implemented by changing this plan.

### Calibration loop

For each bounded scene slice:

1. Lock source frame/clip and all relevant inputs, projection, and clocks.
2. Reproduce it through both ordinary interaction and controlled input entry.
3. Establish source camera constraints; compare geometry/layout/depth before
   altering a camera already supported by evidence.
4. Use flat/object-isolation diagnostics alongside representative final
   materials from the beginning. Classify geometry, core, and glow separately.
5. Change one causal layer at a time. Produce matched side-by-side images,
   overlays, classifier overlays, and short motion comparisons.
6. Check the interval around each anchor immediately: slow/fast/reverse,
   jump, stationary effects, resize, and real restored navigation.
7. Record exactly which property passed and its dependencies. A proxy layout
   lock is not final silhouette, lighting, or motion acceptance.

Reopen dependent locks after a shared change. Do not defer all playback to
Phase 15 or all graphics to Phase 16. Do not require final geometry accuracy
before authoring the geometry that determines it.

## Phased execution and stop/go gates

Phase numbers remain for traceability. Execute repair sprints S0–S8 first,
covering R1/R2/R4 and the identified foundation corrections. Stop for the user's
decision, then start representative R3 and successive scene slices. Each slice
combines its camera, geometry, motion, and representative graphics. Phases
15–19 are final integration/qualification, not the first time those concerns
are tested. Repair completion alone does not accept their final visual gates.

### Phase 0 — preservation

Accepted. Retain recoverable history, recording LFS/hash, and inventory.
Preserve unrelated changes. No external scratch directory is the archive.

### Phase 1 — authoritative evidence

Partially reopened. Keep the 15 hash-locked anchors and existing measurements.
Validate source/local classifier meaning; add contextual silhouettes, visible
core/glow, surrounding-mark and continuous-motion coverage per upcoming slice.
Resolve field-preview gating only after input/projection/time correspondence.
Do not make all source evidence gathering a months-long prerequisite: gather
and validate the needed slice before implementing it.

Gate: each claimed behavior has traceable evidence and uncertainty labels;
no source/implementation substitution, unexplained mapping, or unsupported
“observable set complete” declaration.

### Phase 2 — current-page and production safety

Retain historical development smoke as cleanup protection. Add production
startup, console/hydration checks, actual Canvas initialization failure,
context loss, delayed readiness, keyboard/menu, and useful fallback checks.
The default E2E server uses development mode and must not be called a
production smoke run.

Gate: production page renders or fails usefully without stranding the loader;
the test identifies the actual rendering context and build mode.

### Phase 3 — legacy severance

Accepted for audited source removal. Preserve one active scene/fallback
boundary and no old renderer switch/import. Recheck executable production
assets at final cutover; do not treat source-map strings as executable code.

### Phase 4 — CSS and dependency hygiene

Accepted for scoped ownership. Remove capture-specific production styling and
superseded compensation blocks as their replacements pass. Preserve shared
non-hero consumers. No dead selectors, parallel renderer, or hidden fallback
to legacy behavior.

### Phase 5 — architecture and deterministic rendered state

Reopened; implement R1. Keep serializable contracts, separated modules,
unit targets, atomic capture manifests, and production/evidence separation.
Add actual rendered camera matrices/progress, route tip, contact gates, and
local-clock observables. Verify normal/direct equivalence and movement, not
only the final DOM signature at one progress.

Gate: common rendered-state ownership; traces and screenshots converge under
forward/reverse/jump/resize/native restoration; all applicable named states
and relevant intervals are covered. Pixel-stable repetition of one state
does not close the matrix.

### Phase 6 — DOM, physical mapping, and lifecycle

Reopened; implement distinct source formulas from audit A01. Verify both
sides of every DOM threshold using physical scroll. Preserve useful measured
containers, but also fix visible CTA clipping, cue wrapping, typography,
3D entrance/exit, opacity, header overlap, and page-height correspondence.

Gate: ordinary user navigation matches source copy/scene timing, with no early
scene freeze, forced step override, overflow, hidden required copy, or loader
completion disconnected from resource readiness.

### Phase 7 — canonical paths and spatial ownership

Source coordinates remain accepted. Implement R2; distinguish camera paths,
feeders, blue paths, sampling, contacts, and local fractions. Remove invented
landing paths and disabled-depth compensation. Validate physical widths and
classifiers independently. Replace arbitrary proxy-size tests with measured
layout and frustum/depth checks.

Gate: source role/consumer consistency and normal moving contact pass.
Projected accuracy is closed with the corresponding scene slice, not
“accepted because all paths live in one file.”

### Phase 8 — constrained camera and geometry anchors

Begin with landing, then activation, clearance, field preview/contact,
arrival, and exit. Hold matched input/time and start with verified source
projection/pose. At settled landing the known runtime values are position
`[-80,66,15]`, target `[-50,0.15,-35]`, vertical FOV
`14.4262925614°`. The GLB's raw authored pose is not the final live pose.

Fit unknown scene geometry and only genuinely unresolved camera parameters.
Check primary and secondary context, negative space, depth, and route bounds.

Gate: each scene slice's measured anchors and neighboring motion pass with
representative geometry/materials. No global all-anchor freeze on placeholder
geometry, and no camera compensation for a demonstrably wrong city.

### Phase 9 — continuous camera behavior

Preserve source-confirmed camera functions where they are known. Validate
damping near `0.15s` desktop / `0.10s` mobile through measured response.
Sample start/quarter/half/three-quarter/end and densely around contacts/turns.
Check source trajectory rather than imposing arbitrary axis monotonicity.
Include pointer displacement in matched input tests.

Gate: no snap, flip, compounded turn, clipping, scale discontinuity, or
route/camera separation in slow/fast/reverse motion; anchors remain correct.

### Phase 10 — loader, reveal, and landing graphics

Establish landing graphics while later scenes are still being developed. Match reload reset,
orbiting blue squares, sweeping elliptical contours, brand resolution, world
reveal, tilted headline/body entrance, idle packet cadence, and ambient
industrial motion. Establish complete landing graphics, not just loader
timings and proxy contours.

Gate: matched clips and static frames pass, readiness is sound, idle persists
correctly at rest, scroll takes over correctly, and the user reviews the slice.

### Phase 11 — activation

Match industrial/cooling structure silhouettes and context, red feeders,
moving tips/contact, and handoff to blue, with source-aligned camera/DOM.
Use representative surface/shadow/glow response during construction.

Gate: complete activation interval, contact frames, depth, graphics, and
adjacent landing/clearance states pass together.

### Phase 12 — clearance and pointer trail

Match broad industrial layout, workers/turbines/vehicles, blue travel,
negative space, field preview, and fine-pointer interaction. Validate floor
raycast, trail centroid (within `12 CSS px` of the reference projection),
radius/falloff, decay, and subtle camera displacement. Use the verified source
device predicate for pointer-effect omission; do not equate it with CSS coarse
pointer, viewport width, or a capture label.

Gate: matched pointer traces and no-pointer playback pass without changing
the canonical route to compensate for context or projection errors.

### Phase 13 — field approach, contact, and pulse

S0 resolved the provisional `0.50–0.54` static reveal as unsupported: static
tiles remain present, while source `0.72–0.75` gates pulse/center effects.
S2 removes the compensation before this phase. Match tile
layout, contact figure, camera turn, pulse bands, emissive response, repeated
cycles at rest, and reverse/reset behavior. Do not conflate first visibility,
grid ratio, contact, and local-clock start.

Gate: field envelope/count/profile, standing-figure union, core/glow, cadence,
and rendered-progress synchronization pass across multiple cycles and entries.

### Phase 14 — arrival and exit

Match the frontal arrow's authored silhouette/thickness, horizontal cyan feed,
surrounding marks, contact activation, copy, and white-section handoff. Recreate
the live continuous retreat from scene progress `0.90` through `1.25`;
do not insert an invented time hold because a recording frame is readable.

Gate: near/far silhouette, marks, activation/retraction, camera retreat, and
DOM handoff pass forward and backward.

### Phase 15 — full desktop integration

Motion is already tested in each slice. For this phase's user-approved
completion gate, run complete normal, slow, fast, and reverse journeys. Compare
chronology and rendered traces to reference inputs; do not replay recording
seconds as a universal timeline. Jump, resize, stationary-effect, and native
restoration completeness are deferred and do not block this phase.

Gate: no dead zone, incorrect copy step, double trigger, contact lag, clock
drift, history dependence, or reopened static/graphics state.

### Phase 16 — final desktop graphics refinement

Refine the graphics foundation established in Phases 8–14: palette, surface response,
lighting, shadows, reflections, fog, core/glow, typography, trail, antialiasing,
and temporal quality. Recheck every structural and motion gate after shared
changes at recording and live desktop profiles.

Gate: no visible approximation, clipping, depth artifact, shimmering, missing
context, or material/typographic mismatch outside approved identity exceptions.

### Phase 17 — responsive qualification

Observe actual source conditions before implementing profiles. Separate
viewport breakpoints, pointer capabilities, and the source's iOS-specific
lighter-asset selection; “mobile” is not one interchangeable condition.
Do not retain unmeasured tablet heights or an exact `1508×761` style branch.
Measure CSS dimensions, screenshot DPR, and actual render resolution.

Gate: desktop/tablet/mobile anchors, transitions, adjacent-width changes,
orientation, device DPR, and relevant physical devices pass. Quality reductions
are measured and explicitly accepted, never hidden behind screenshot scaling.

### Phase 18 — accessible alternatives

Maintain functional alternatives throughout construction. Finalize reduced
motion from accepted compositions: no continuous camera/tilt/trail/idle/pulse,
discrete poses with optional short opacity transitions, settling within
`100ms`. Verify static/WebGL-disabled and actual context-loss paths.

Gate: useful landmark/copy hierarchy, keyboard/focus/menu/contrast/heading
order and axe checks pass, without layout drift or competing clocks.
Accessibility differences remain documented product exceptions.

### Phase 19 — performance, final hygiene, and personal acceptance

Use early representative feasibility checks; perform final production
qualification on locked hardware, GPU, refresh rate, power mode, and DPR.

Minimum budgets:

- LCP below `2.5s`; CLS below `0.1`;
- desktop p95 frame time at most `16.7ms`;
- mobile p95 frame time at most `33.3ms`;
- no steady-state main-thread task above `50ms` during scrub.

Record draw calls, geometry/material counts, asset weight, memory, and real
backing resolution. Optimize without silently degrading accepted graphics.
Remove replaced proxies, adapters, unused primitives/selectors, diagnostics,
and production test controls. Verify a fresh production graph and complete
profile/state/behavior matrix.

Gate: all visual, motion, safety, accessibility, and hardware budgets pass;
the user reviews the complete normal experience and explicitly accepts it.
If hardware cost and fidelity conflict, present the measured tradeoff rather
than redefining A-grade quality.

## Verification and reporting

Use repository-pinned Node/pnpm and Nx targets:

```sh
pnpm nx run @site/pegasoft:test -- --run
pnpm nx run @site/pegasoft:typecheck
pnpm nx run @site/pegasoft:lint
pnpm nx run @site/pegasoft:build
pnpm nx run @site/pegasoft-e2e:typecheck
pnpm nx run @site/pegasoft-e2e:lint
pnpm nx run @site/pegasoft-e2e:e2e
pnpm nx run @site/pegasoft-e2e:hero-capture
pnpm nx run @site/pegasoft-e2e:hero-compare
```

Select focused checks proportionate to each change; report exactly what ran.
Production smoke/performance requires explicit production-server configuration,
not the default development E2E server. Capture hashes prove artifact integrity,
not renderer correctness. Unit passes prove tested contracts, not source fidelity.

After each checkpoint, state plainly: what changed, which gate passed, what is
still visibly wrong, and what the user can review. Keep historical results tied
to their revision/run and reopen acceptance when the underlying assumptions
change.

## Supporting records

- [Measurable subagent repair sprints](./hero-reference/repair-sprints.md)
- [Repair sprint status and evidence ledger](./hero-reference/repair-sprint-ledger.json)
- [Foundation audit and reproducible findings](./hero-reference/foundation-audit-2026-09-15.md)
- [Live source evidence](./hero-reference/live/source-evidence.json)
- [Reviewed source measurement amendments](./hero-reference/recording-measurement-amendments-v1.json)
- [Decision log](./hero-reference/decision-log.json)
- [Architecture/harness checkpoint and audit override](./hero-reference/architecture-harness-report.json)
- [Cleanup inventory](./hero-reference/cleanup-inventory.json)
- [Motion observation notebook](./vectr-hero-motion-map.md)

S0–S5 passed independent review. S6 is independently accepted within its
bounded lifecycle and visible-DOM scope; its accepted browser packet and
limitations are recorded in the linked S6 status, review, and acceptance
records. S7 is accepted within bounded repair scope at 336/336 from the v5
packet and independent APPROVE. S8 is qualified within bounded technical scope;
the sealed packet and focused review remain evidence, not final visual approval.
R3's earlier landing-to-activation slice remains historical and unaccepted;
current execution through Phase 19 follows the tracker and recovery plan.
The v4 0/336 result remains historical evidence. Do not claim final visual
fidelity or whole-hero acceptance.
