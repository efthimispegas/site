# Hero foundation repair sprints

Status: Historical execution breakdown; live status is maintained only in ../pegasoft-hero-baseline-plan.md
Plan date: 2026-09-15

## Purpose and boundary

Repair the defects identified in the [foundation audit](./foundation-audit-2026-09-15.md)
before starting the revised plan's visual-construction work. This is the
execution breakdown of R1, R2, and R4 in the
[baseline plan](../pegasoft-hero-baseline-plan.md), plus the foundation parts
of A04/A06. R3, the representative landing graphics slice, is the first
post-repair implementation checkpoint. It is deliberately outside these sprints.

The user authorized S0–S8 repair execution and parallel subagents. S0/S1/S2/S4 passed
independent review; S3/S5 are accepted. S6 was previously blocked at delayed-resource
qualification after the original loop and an authorized reframe each exhausted
three failed passes. S7 is dispatched but blocked after three failed
full-matrix passes and an incomplete reviewed sharded packet; those results and
the v4 0/336 state are historical evidence. S7 is now accepted within bounded
repair scope after the v5 packet's strict validation, complete handover, and
independent APPROVE. S8 is qualified within bounded technical scope; the
baseline plan owns current phase authorization and R3 status.
The sprint ledger records retained assignments and evidence. Current phase
authorization and implementation status live only in the baseline plan.

The accepted source coordinates and scoped legacy cleanup remain intact.
Finishing repairs does not accept Phases 1–7 wholesale or imply visual parity.
Final graphics, scene silhouettes, typography refinement, camera intervals,
and responsive visual acceptance remain in the baseline plan.

## Sprint board and order

Each sprint is an outcome-bounded work package, not a promised number of days
or agent turns. Start/finish dates are recorded from actual execution. If a
package cannot fit one independently reviewable change set, split its tasks
before dispatch; never close it because a time or token budget expires.

| Sprint | Outcome                                             | Owning subagent role                  | Prerequisites                     | Required finish evidence                                                                        |
| ------ | --------------------------------------------------- | ------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| S0     | Lock repair contracts and reproducible failures     | Evidence/contracts                    | Written authorization             | A01–A10 coverage map; versioned test/input contracts; source uncertainties resolved for repairs |
| S1     | Correct physical scroll and DOM/scene mappings      | Progress                              | S0                                | Formula/boundary regressions pass; early scene movement restored; no forced copy step           |
| S2     | Share actual rendered progress and clocks           | Frame-state                           | S1                                | Frame-by-frame camera/route/effect synchronization and reset tests                              |
| S3     | Correct route consumers and depth                   | Routes                                | S2, S4                            | Shared idle/activation feeders; occlusion tests; source knots unchanged                         |
| S4     | Make comparison gates trustworthy                   | Measurement                           | S0                                | Classifier challenge fixtures; honest scene/text/raster gates; immutable run provenance         |
| S5     | Remove capture-specific production behavior         | Profiles                              | S2                                | Neighbor-size/device matrix; backing-resolution evidence; no special recording styling          |
| S6     | Repair readiness, fallback, and visible DOM defects | Lifecycle/DOM                         | S3, S5                            | Actual-context failure/recovery tests; ordinary-page clipping/wrapping regressions              |
| S7     | Prove normal/direct and production equivalence      | Browser qualification                 | S3, S4, S5, S6                    | Full repair behavior matrix, real restoration, production smoke, fresh capture manifest         |
| S8     | Independently qualify and hand over repairs         | Independent reviewer; root integrates | S7 and all earlier sprints closed | No open repair defect; signed scope-limited report; remaining visual failures explicitly listed |

Safe execution waves:

1. S0 alone.
2. S1 and S4 may run concurrently on disjoint files.
3. S2 after S1; unfinished S4 may continue separately.
4. S3 and S5 may run concurrently once their dependencies pass.
5. S6, then S7, then S8.
6. Stop at the recorded sprint boundary; subsequent phase work is governed by
   the baseline plan, not this historical schedule.

The numeric IDs are stable tracking identifiers; dependencies, not numeric
order, control dispatch. S4 precedes S3's final route-width/classifier review.

## Subagent operating contract

- The root agent coordinates and owns the sprint ledger, main plan, decision
  log, source-evidence record, and architecture acceptance summary. Workers
  submit proposed changes to those shared records in their handover; they do
  not edit them concurrently.
- Maximum concurrent allocation: root + two implementation workers + one
  independent reviewer. Reuse roles between waves; do not create nine
  simultaneous agents or separate user-owned tasks.
- Each active file has exactly one writer. The ownership below is a lease for
  that sprint, released on integration. Read access is shared. A new shared
  interface or out-of-scope edit requires root coordination, not unilateral
  edits across another worker's files.
- Every worker must be told: **You are not alone in this codebase. Preserve
  unrelated work and other agents' edits; do not revert them. Work only in
  your assigned files and adapt to integrated changes.**
- Root serializes browser/GPU capture and production builds in the shared
  checkout. Existing browser tests already use one worker. Concurrent captures
  must not overwrite output directories or change a shared page/server.
- A worker may report implemented, not accepted. A different subagent reviews
  the diff, reruns the relevant checks, and inspects the required visual
  artifacts. Root integrates and marks the sprint complete only after that
  review passes. The same rule applies if one agent fills multiple roles over
  time: it cannot independently review its own implementation.
- Each integration must keep app/E2E typechecking and unaffected regressions
  working. If an interface changes, root assigns the necessary consumer edits
  before closing that sprint; do not leave a broken checkout for S7 to repair.
  Replace assertions encoding an audited defect with source-backed regressions,
  rather than keeping false expectations or silently skipping them.
- Do not delete legacy-unrelated shared dependencies, copy reference assets
  into production without authorization, alter source knots, fit camera poses,
  replace city geometry, or introduce a second renderer in these sprints.
- Follow repository AGENTS.md and applicable Nx skills. Prefer actual resolved
  targets, not invented task/configuration names. All new files named below are
  proposed task outputs, not files claimed to exist already.

## Shared measurements and test rules

S0 fixes the executable test matrix before implementation. These are minimum
engineering checks, not newly discovered reference behavior or weaker visual
tolerances:

- Pure formula error: at most `1e-6` in normalized progress against an
  independently encoded source formula; finite outputs at every tested input.
- Shared-frame consistency: camera, beam, and coupled effect consumers report
  the same applied progress within `1e-6`, with the same frame sequence number.
  This internal invariant is not a source screenshot matching tolerance.
- End-to-end source/local handoff error: at most `0.005` in its correct domain,
  retaining the main plan's camera settling and visible-error requirements.
- Test every measured DOM threshold and source scene gate immediately below,
  at, and above it; use `±0.001` progress for formula tests and `±1 CSS px`
  physical scroll for browser threshold tests. Test clamping separately.
- Source scene gates include `0`, `0.17`, `0.72`, `0.74`, `0.75`, `0.85`,
  `0.90`, `1`, `1.25`. DOM thresholds remain `0.191`, `0.697`, `0.876`.
  S0 must distinguish gate types rather than force all effects onto this list.
- Required viewport profiles: recording desktop `1508×761`, live desktop
  `1440×900`, tablet `1024×768`, mobile `390×844`. Source behavior is measured
  per profile; do not assume the desktop formula's layout constants on mobile.
- Run same-input internal comparisons with a fixed seed, pointer, local clock,
  fonts, viewport, and actual backing resolution. Numerical equality requires
  equally frozen frame states, not arbitrary elapsed wall time.
- A regression test must fail for the original defect and pass after repair.
  Record that proof through an isolated fixture or reviewed before/after
  revision; never reset the shared checkout destructively to demonstrate it.
- Failed, blocked, skipped, and not-applicable are distinct statuses. No metric
  widening, new masks, fabricated source measurement, or expected-failure
  relabeling may be used to make a repair appear complete.

## S0 — contracts, source semantics, and failure baseline

Completed after [independent review](./repairs/s0/review.md). The criteria below
are retained as the acceptance record, not an instruction to repeat S0. Fresh
source measurement verified the existing desktop resolution cap; the static
field opacity compensation was disproved. Successors use the frozen
[source](./repairs/s0/source/source-contract.md) and
[input/frame/capture](./repairs/s0/contracts/README.md) contracts.

Audit coverage: A01–A10 planning; source uncertainty in A04/A08/A09.

Owner: evidence/contracts subagent. Writes only its proposed
`docs/hero-reference/repairs/s0/` report/fixtures. Root applies reviewed shared
source/decision updates. No runtime edits.

Work:

Reuse the completed audit and existing evidence; this is a delta/contract pass,
not a second open-ended audit or a prerequisite to remeasure the entire hero.

1. Record base revision plus existing dirty diff, authoritative source hashes,
   current runtime/browser versions, and recovery method. Do not overwrite the
   user's audit-document changes or treat HEAD alone as the working baseline.
2. Produce a source-role table for physical scroll, DOM progress, scene target,
   rendered progress, idle/feeders, camera paths, effect gates, and clocks.
3. Resolve the disputed static-field/grid-ratio relationship sufficiently to
   specify a repair: matched input/time/projection plus source shader semantics.
   Do not simply restore `0.72` or keep `0.50–0.54` based on a name.
4. Lock interfaces for physical measurement, frame diagnostics, readiness, and
   capture metadata so later workers do not invent incompatible APIs.
5. Map all ten findings to repair tests and any explicitly deferred visual
   acceptance. Inventory wrong proxy assumptions and capture-specific rules.

Measurable exit:

- 10/10 findings mapped; zero unowned repair items.
- A01 sample inputs `scrollY=100,304,700,2250` at the audit geometry reproduce
  the defect; source expected values are independently calculated.
- One reproducible before-case each for mixed clocks, invented idle paths,
  profile discontinuity, actual-context failure, and visible DOM defects.
- Source disagreements needed for runtime repairs are resolved or S0 stays
  blocked. Future art details may remain unknown only with a named phase owner.
- Frozen contracts specify every later matrix row and non-applicability rule.

Handover: source-role table, failure inventory, dependency/interface proposal,
and exact executable checks. Completion does not claim a fixed application.

## S1 — physical progress and ordinary DOM state

Audit coverage: A01 and the direct-step part of A05.

Owner: progress subagent. File lease within
`apps/pegasoft/src/app/shared/`: `pegasoft-home.tsx`; within `hero-scene/`:
`hero-contract.ts`, `hero-controller.ts`, `hero-sequence.ts`,
`use-hero-controller.ts`, `hero-development-control.ts`, and related contract,
controller, and sequence tests. No camera/material/layout tuning.

Work: preserve physical scroll before clamping; derive DOM and scene domains
independently; remove capture-fitted normal mapping; make direct-state input
resolve through normal step/copy logic. Coordinate any test-only capture
interface proposal with S4 rather than editing its files.

Measurable exit:

- Formula tests pass at zero, early scroll, all boundary triplets, deep exit,
  and resize-derived page geometry with error at most `1e-6`.
- The four A01 regression samples select the expected progress and steps;
  positive early scroll moves the scene before `0.4H`.
- Zero direct `processStepIndex`/copy overrides used to satisfy expected
  outcomes; test controls supply inputs, not answers.
- No lost negative/overscroll handling, non-finite output, or discontinuity
  introduced by supported page measurements.

Handover: before/after boundary table, regression results, and finalized input
contract. Ordinary-page browser confirmation follows in S7, not silently waived.

## S2 — one rendered frame state and correct local clocks

Audit coverage: A02, rendered-state part of A05, A04 field-gate repair.

Owner: frame-state subagent. `hero-scene/` lease: `hero-camera.tsx`,
`hero-camera-model.ts`, `hero-beam.tsx`, `hero-local-clock.ts`,
`hero-field-model.ts`, `hero-development-diagnostics.ts`, `hero-world.tsx`,
`hero-contract.ts`, `hero-model.spec.ts`, stages `activation.tsx`,
`field-match.tsx`, `arrival.tsx`; proposed `hero-frame-state.ts` and dedicated
tests if justified. Camera math remains source-constrained, not visually fitted.

Root's S2 lease additionally covers `hero-scene.tsx` only for shared-frame
wiring/removal of reference-initialized camera output, and
`hero-landing-rails.tsx` only for removing label/clock injection and consuming
the shared frame. S3 retains rail geometry/depth ownership; S5/S6 retain later
Canvas profile/lifecycle ownership. The screen-settling budget is not a
normalized-progress residual test; preserve the source damping recurrence.

Measurable exit:

- One frame-state owner; zero coupled effects read immediate target progress
  where the source uses rendered progress. Target-driven exceptions are listed.
- For forward, reverse, large jump, and stop sequences at simulated 30/60/120Hz,
  all consumers have matching frame IDs/progress within `1e-6` throughout,
  including contact and release—not just after settlement.
- At least three complete cycles of each repeating repaired effect at rest;
  entry/exit/re-entry resets match the S0 contract. Check a simulated long frame
  without imposing invented source timing.
- Field visibility/grid/contact/clock gates obey the resolved S0 semantics;
  remove the unsupported compensation if that evidence disproves it.
- Neutral settled landing retains source position `[-80,66,15]`, target
  `[-50,0.15,-35]`, FOV `14.4262925614°`; no camera-fit workaround.

Handover: frame trace, gate/reset matrix, diagnostic schema, and regression
tests. Full rendered browser parity is still an S7 requirement.

## S3 — source route consumers, occlusion, and proxy hygiene

Audit coverage: A03, route part of A08, proxy-test part of A06.

Owner: routes subagent. `hero-scene/` lease: `hero-route.ts`,
`hero-landing-rails.tsx`, `hero-landing-rail-model.ts`, `hero-beam.tsx`,
`stages/activation.tsx`, `hero-world-layout.ts` (ground coverage only),
`hero-world-layout.spec.ts`; proposed dedicated route/occlusion tests. Read
frame-state interfaces from S2; do not concurrently edit S5's world/profile files.

Measurable exit:

- Four idle paths resolve to the same canonical feeder definitions as four
  activation paths; zero independent camera-fitted landing arrays remain.
- Source-coordinate serialization unchanged; red camera path, feeder contacts,
  blue-zero sampling and blue-one sampling have separate role tests.
- At least one fully hidden and one partially hidden packet case, plus an
  unobstructed control, pass real rendered depth tests in landing and activation.
- Physical radius, selected core, and glow are distinct reported quantities;
  no reduced tube width justified only by a classifier pass. Restore or justify
  source physical values without claiming final shader/glow fidelity.
- Arbitrary block-count/maximum-size tests no longer claim source acceptance.
  Actual ground/frustum coverage is checked at all 15 named camera states and
  the exit interval; any exposed ground edge is repaired without fitting camera.
- No source-knot, camera-pose, or city-art change slipped into the diff.

Handover: source/local idle and activation clips/images, depth challenge
captures, path-role/radius report, and remaining visual-width errors for R3.

## S4 — trustworthy comparison and evidence provenance

Audit coverage: A07, measurement part of A08, reporting part of A10.

Owner: measurement subagent. Lease:
`apps/pegasoft-e2e/src/visual/screen-structural-features.mjs`,
`screen-composition.mjs` and declarations where required;
`tools/hero-reference/compare-captures.mjs`,
`measure-recording-bounds.mjs`; proposed comparator regression fixtures/tests.
Root owns any Nx target wiring and shared acceptance records.

Measurable exit:

- Challenge fixtures cover missing route, moved route, core-width change,
  glow-only change, bright-tile contamination, contact overlap, clipped subject,
  approved identity difference, and visible copy overflow. Zero false passes
  on these known defects; uncertain classification is blocked, not accepted.
- Displayed source/local classifier overlays reviewed independently for all
  12 source-applicable route states and seven landmark states. No source mask
  is applied to local pixels; no local-composition ROI silently loses its subject.
- Scene, visible text, motion, and final-review gates are separate. Unmasked
  identity-sensitive raster is explicitly diagnostic until valid pixel-level
  exclusions exist; whole text-box masks remain prohibited.
- Positive controls pass and deliberately corrupted controls fail. No blanket
  failure/disabled comparator can meet this sprint's gate.
- Wrong/missing artifact hash, stale run/revision linkage, and mixed-profile
  captures are rejected. Reports retain raw images and exact provenance.
- If the classifier repair changes measurements from unchanged reference
  pixels, retain the original anchors and use an explicitly selected,
  independently reviewed source-measurement amendment. Bind its base manifest,
  image and classifier hashes, old/new values, state and allowed measurement
  fields. Reject wrong hashes, duplicate targets and non-measurement changes;
  this mechanism may not alter accepted world coordinates or historical local
  captures. Fresh local measurements belong to S7.
- Known local visual mismatches remain failures; improved report honesty is
  not reported as improved scene fidelity.

Handover: classifier overlay review, challenge-fixture results, proposed gate
schema, and passing integrity tests. S7 integrates the finalized capture writer
after all runtime contracts stabilize.

## S5 — production profiles and actual render resolution

Audit coverage: A09 and capture-specific hygiene in A04/A06.

Owner: profiles subagent. `hero-scene/` lease: `hero-profile.ts`,
`hero-world.tsx`, `hero-contract.ts`; proposed dedicated profile tests.
Any required `hero-scene.tsx` Canvas resolution edit is leased to this worker
now and released before S6. No final mobile composition or asset rebuild.

The S5 start packet may additionally lease `pegasoft-home.tsx` for the
recording-only page background, `use-hero-controller.ts` for explicit device
inputs, `hero-controller.spec.ts` for obsolete profile assertions, and minimal
Canvas sizing CSS/frame-owner wiring. These leases start only after S2 releases
its files. `hero-lighting.tsx` is limited to source-verified profile/quality
predicate repairs; generic mobile reductions are not accepted source evidence.
No S6 copy/lifecycle edits or final lighting/art tuning are included.

Measurable exit:

- No production color/geometry branch for exactly `1508×761`. Check
  `1507/1508/1509 × 761` and `1508 × 760/762`: same behavioral profile away
  from real breakpoints, with no discrete style jump.
- Every actual source breakpoint has below/at/above tests. Distinct fine/coarse
  pointer and iOS/non-iOS cases follow observed predicates, not a generic
  “mobile asset” assumption. Replace unsupported journey heights with measured
  rules; if source evidence is missing, sprint is blocked for that rule.
- Source/local actual backing width, height, DPR and screenshots recorded at
  the four required profiles; equality of screenshot DPR is never sufficient.
- No hidden resolution compromise. Any deliberate quality cap differing from
  reference requires explicit user acceptance; do not silently waive it.
- Resize preserves correct physical mapping and stable resource ownership;
  source-sourced profile rules are tested without changing accepted route data.

Handover: predicate/breakpoint matrix, resolution report, and all remaining
responsive visual work explicitly reserved for later phases.

## S6 — real readiness/failure handling and visible DOM repairs

Audit coverage: A10, visible DOM part of A07, remaining lifecycle parts of A01/A05.

Owner: lifecycle/DOM subagent. Lease: `pegasoft-home.tsx`; `hero-scene/`
`use-hero-controller.ts`, `hero-controller.ts`, `hero-scene.tsx`,
`hero-fallback.tsx`, `hero-shell.module.css`, `hero-scene.module.css` and relevant
tests; `apps/pegasoft-e2e/src/hero-alternatives.spec.ts`.

Add narrow leases for `pegasoft-home.module.css` (proven first-CTA clipping),
`hero-contract.ts` (attempt-scoped lifecycle/readiness events), and frame-owner
initialization only where needed to reject abandoned attempts and reset history
on genuine remount. These leases begin after S3/S5 release their files. Keep
presentation timing, useful fallback availability and actual Canvas readiness
distinct; S2 pre-render diagnostics alone cannot establish completed rendering.

Measurable exit:

- Successful separate capability probe plus failing actual Canvas creation
  selects a useful fallback. Active context loss does not leave a blank hero.
- Fatal initialization/context errors show fallback within `1000ms` of error
  observation. This is a proposed engineering response budget, not source timing.
- A controlled `5000ms` resource delay cannot produce premature render-ready
  state; readiness reflects applied frame/resources. The S0 contract must also
  define a finite loading timeout and fallback behavior for never-ready assets.
- Test failure before mount, loss after landing, loss mid-journey, restoration
  or deliberate fallback retention, reduced-motion change, and unmount/remount.
  Zero duplicate Canvas/listener owners after recovery.
- Primary CTA text is not clipped; cue wrapping matches reference layout intent
  at the four profiles. Ordinary entry verifies visible ink/line layout, not
  only container rectangles or forced direct states. Respect Pegasoft wording.
- Keyboard/menu/focus and relevant axe checks pass. Reduced-motion transitions
  retain the main plan's `100ms` settlement requirement.

Handover: actual-context fault evidence, loading timeline, visible DOM captures,
and focused accessibility results. Full loader art and typography polish remain
post-repair work; these tests close functional defects only.

Historical checkpoint (2026-09-25): S6 remains independently accepted within its lifecycle and visible-DOM scope. S7's newest same-build v5 packet completed all 60 state/profile shards and persisted 336/336 applicable passes and 24/24 predeclared N/A observations. The final independent review returned APPROVE, so S7 is accepted within bounded repair scope at 336/336. The older 71-pass mobile restoration stop remains historical evidence. The [S7 checkpoint](./repairs/s7/status.md) retains exact evidence. Current S8/R3 status belongs to the baseline plan. Do not claim final visual fidelity from this evidence.

## S7 — real browser and production repair qualification

Audit coverage: A05 plus integrated verification of A01–A10 repairs.

Owner: browser-qualification subagent. Lease:
`apps/pegasoft-e2e/src/pegasoft.spec.ts`,
`src/visual/hero-reference.visual.ts`, `playwright.config.ts`,
`playwright.visual.config.ts`; proposed focused repair spec/config if needed.
Root owns Nx wiring after reviewing the resolved configuration. No runtime
changes except separately assigned defect follow-ups returned to their owner.

Measurable exit:

- Complete normal/direct comparison matrix: all 15 states × four profiles ×
  six entry modes (forward, reverse, direct input, jump, resize, native restored
  navigation) = 360 classified cells. S0 must mark impossible combinations,
  such as scrolling backward into a loader, N/A with a reason before execution.
  Every applicable cell passes; no unrecorded/skipped/blocked cells are accepted.
- At each applicable cell, compare actual applied pose, route/contact state,
  and local clocks at matched inputs, not only DOM attributes. Account for
  reference-supported history-dependent local effects explicitly; do not force
  arbitrary pixel equality across different elapsed histories.
- All DOM/scene boundary triplets and four motion sequences from S2 receive
  real-browser checks. Repeated capture determinism is tested for all named
  states in each applicable capture profile, not just one field state.
- Native restoration is exercised by genuine navigation/back/reload behavior
  without a post-navigation `scrollTo` that manufactures success.
- Explicit production build/server smoke passes on desktop and mobile browser
  profiles, including actual-context faults from S6. Record build identity,
  server mode and startup command; do not reuse a development server silently.
- New capture manifests bind artifacts to revision/diff, inputs, applied frame,
  fonts, source, profile/backing dimensions and run ID. Wrong or incomplete
  manifests fail. Full source/local comparison is generated without pretending
  remaining visual failures are repaired.
- Production executable scan contains no legacy renderer or test-control
  backdoor. Use a separate test-enabled build for deterministic diagnostics if
  needed, and prove ordinary behavior separately in the shipping build.

Handover: matrix with pass/fail/N/A reasons, normal-playback clips, frame traces,
production/failure logs, and fresh structural report with visual debt intact.

## S8 — independent repair acceptance and phase handover

Owner: independent reviewer subagent. No runtime writes. Root owns integration
and shared report/status updates. The reviewer cannot be the author of the
changes it is signing off; split reviews between independent agents if needed.

Measurable exit:

- S0–S7 completed with independent review; 10/10 audit findings have explicit
  repaired aspects and named remaining visual-phase obligations. Zero unresolved
  foundation repair defects, regardless of priority label.
- Fresh app/E2E typecheck and lint, app unit tests/build, and repaired browser
  qualification succeed at the integrated revision. New regression tests prove
  the original defects; 42 old passes alone do not satisfy this condition.
- Scope audit: no source-knot distortion, hidden legacy path, unapproved identity
  masking, capture-only production behavior, opportunistic camera/art fitting,
  unrelated dependency removal, or false visual acceptance.
- Review raw landing/idle/activation images and normal motion, not reports alone.
  Confirm repair effects and list every still-visible mismatch requiring R3+.
- No hardware performance/final art claim from an emulated or placeholder-world
  run. Define the representative-hardware run for R3; do not demand final-world
  performance before the final world exists.
- Root produces one repair-acceptance summary and a precise first R3 assignment.
  Historical status only; current disposition is maintained in the baseline plan.

Stop here. The user decides whether to proceed to the landing graphics slice.

## Audit coverage and deferred scope

| Finding | Repair owners             | What still belongs to visual phases                                             |
| ------- | ------------------------- | ------------------------------------------------------------------------------- |
| A01     | S0, S1, S6, S7            | Final copy/scene appearance beyond repaired timing/layout defects               |
| A02     | S2, S7                    | Final motion nuance and complete interval fidelity                              |
| A03     | S3, S7                    | Final beam appearance and scene integration                                     |
| A04     | S0, S2, S5, S8            | Accurate city geometry and source-constrained camera/geometry calibration in R3 |
| A05     | S1, S2, S7                | Final full-experience comparison after each visual slice                        |
| A06     | This schedule, S0, S3, S8 | Early landing graphics/performance feasibility in R3; remaining world art later |
| A07     | S4, S6, S8                | Final typography/identity-aware image acceptance and personal review            |
| A08     | S0, S3, S4                | Final shader/core/glow visual match, revalidated as graphics change             |
| A09     | S0, S5, S7                | Full responsive composition and physical-device graphics qualification          |
| A10     | S4, S6, S7, S8            | Final all-profile performance and release evidence                              |

Deferred work is never counted as fixed. “Repair complete” means the incorrect
foundation behavior or acceptance claim has been removed and regression-tested;
it does not mean the corresponding final visual requirement has passed.

## Required start packet and finish packet

Before dispatch, root supplies each worker:

1. Sprint ID, implementation authorization, exact base revision/dirty-state
   inventory, passed prerequisites, and source contracts.
2. Exclusive file list and explicit exclusions; active co-workers and their
   ownership. Include the preserve-others instruction above.
3. Required failing regressions, minimum measurable exit criteria, Nx targets,
   and a unique repository-owned output directory.
4. Instruction to stop at the sprint boundary and return evidence; no automatic
   advancement to another sprint, new task, commit/push, or visual phase.

Each finish packet must contain:

- outcome and exact changed files; implementation revision/diff digest;
- finding/test IDs, before-failure proof, after-results and exact commands;
- authoritative source refs plus capture/run hashes, profiles and build mode;
- raw visual artifacts and rendered traces where required, with observations;
- failures, blocked checks, N/A reasons, remaining visual debt and known risks;
- proposed shared-doc updates and next owner's interface notes;
- independent reviewer identity, review findings, and root acceptance decision.

Reports belong under proposed `docs/hero-reference/repairs/s<N>/`; large
reproducible captures use a unique existing E2E output directory referenced by
the report. Preserve manifest/hash and reproduction inputs if large outputs
are not committed. Never cite obsolete external scratch assets as authority.

## Verification targets and release rule

Resolved on 2026-09-15: app has `test`, `typecheck`, `lint`, `build`, `start`;
E2E has `typecheck`, `lint`, `e2e`, `hero-capture`, `hero-compare`.
`hero-compare` already depends on `hero-capture`, so do not accidentally run
duplicate capture jobs concurrently. Existing default E2E starts `next dev`;
production qualification configuration is S7 work, not an existing guarantee.

Use relevant Nx targets for each sprint and uncached qualification when fresh
execution is required. For new tool regression coverage, root adds/locates the
appropriate Nx-owned test task; do not claim the app unit target tests `.mjs`
comparison tools automatically. Re-query targets after configuration changes.

The [sprint ledger](./repair-sprint-ledger.json) records actual status and
evidence, not estimated completion. Legal progression is
`planned → ready → in-progress → implemented → in-review → completed`.
Use `blocked` with a reason and resume from the last unmet gate; return failed
review to implementation. A successor cannot start from “implemented” alone.
Only root changes the shared ledger after reviewing the evidence.

Written repair authorization and the bounded R3 authorization are recorded in
the baseline plan. Completion of this schedule never marks final visual
acceptance automatically.
