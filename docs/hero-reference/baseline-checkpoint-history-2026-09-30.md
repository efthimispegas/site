# Historical baseline checkpoints — retained 2026-09-30

Historical evidence only. This file preserves superseded narratives verbatim;
its status, next actions and authorization language are not current instructions.
The [baseline plan](../pegasoft-hero-baseline-plan.md) is the sole live authority.
Do not load this record for routine resumption.

2026-09-29 Phase 16 opening-to-activation slice: removed the hard visibility
threshold that made activation structures appear during scroll, limited the
provisional activation set to the destination and nearby yard context so it
does not cover the settled landing, and refined the destination roof, facade,
and emblem. The process controls now announce expanded/current state and link
to their descriptions. At 1280×720, the local settled landing and a forward
scroll were inspected; the opening copy stayed clear and the destination was
visible through the handoff. Nx typecheck and 238/238 app tests passed.
Nx lint remains blocked by 19,345 errors in generated
`.next-lifecycle-review` output; that result does not establish source lint.
This is a candidate, not a Phase 16 acceptance claim: source-matched motion,
materials, lighting, 1440×900 review, cost profiling, and the user's normal
playback visual review remain open. Next compare the first scroll at matched
source/local progress and profile its frame cost before tuning lighting.

2026-09-30 Phase 16 reference-size refinement candidate: compared the saved
landing and activation-contact frames with local 1508×761 renders. Kept five
additional activation workers in world space, added four small destination
trees and a broad static ground falloff, and removed the later landing-landmark
visibility cutoff so reverse motion retains the scene. A trial shadow-receiving
ground produced hard silhouettes and was reverted. Normal forward and reverse
playback were inspected at 1508×761; the destination and route remain aligned
through the handoff without a visible landmark pop. Nx app typecheck, 238/238
unit tests, e2e typecheck, production build, and diff whitespace check passed.
The Nx visual capture is blocked: development HMR WebSocket errors made the
first capture fail; a plain production build omits direct-state diagnostics;
the diagnostics-enabled production run reaches the page but the existing
capture expects `recording-desktop` while the current runtime reports
`desktop`. These three attempts do not establish a visual gate pass. Source
facade/reflection detail, matched normal-playback motion, frame cost, all
affected structural/motion gates, and personal visual acceptance remain open.
Next action: reconcile the capture profile contract without weakening the
assertion, then capture matched states and measure frame cost before further
global lighting or material changes.

2026-09-30 Superpowers execution checkpoint: the remaining authorized path is
Phase 16 capture-contract diagnosis, matched graphics and motion qualification,
then Phases 17–19 in order. The [account snapshot](../ledger/usage-ledger.json)
was initially treated as a pause. The user clarified that the pause gate applies
to the daily five-hour window, not the weekly reading, and authorized work
through the daily allowance. Execution has resumed without redeeming a reset
credit. The final Phase 19 gate still requires the user's normal-playback visual
acceptance.



---

Task 2 checkpoint: fresh run `4c1c48b5-98a6-4a61-9ecf-02a503e7f27f` captured 15/15. Strict provenance passed 15/15 in [comparison report](../../apps/pegasoft-e2e/test-output/hero-reference/runs/4c1c48b5-98a6-4a61-9ecf-02a503e7f27f/comparisons/b6a91fb5-1a4d-4976-be23-a0d4448d42af/comparison-report.json). Capture contracts 28/28, measurement contracts 50/50, browser CSS transport 4/4, both typechecks and E2E lint pass (39 warnings). Visual comparison remains fail: preliminary raster 15 fail; structural 9 fail/6 blocked; DOM 10 pass/3 fail/2 N/A. Blocks include clipped activation landmark classification, non-equivalent route core/glow predicates, and corrected component-membership source measurements awaiting independent review. Resolve these correspondence blockers before Task 3 uses their metrics. Historical captures remain unchanged; no geometry/material repair or visual acceptance is claimed.

Daily usage checkpoint: paused at 96% of the five-hour window (weekly 15% is not the pause gate); no reset credit redeemed. Task 2 remains active/unqualified. Independent review confirmed the existing S4 source overlay matches all 42 proposed leaves in 12 records; comparison may consume `docs/hero-reference/recording-measurement-amendments-v1.json` without changing the base. Loader recording seek 2s is not a verified navigation-relative age; do not assume a .8s offset or mask arc differences as identity. Hash-matched source CSS is saved at `docs/hero-reference/live/locked-reference-loader.css` (SHA256 `cc1ac4c193d083000320123bad183188ced2a082819dbd3a615dbad00ed5700c`): source logo rotates over 1.5s with staged cube/arrow assembly and ellipse erase rules absent from current loader CSS. Next: establish exact recording loader anchor and independent source/local phase, then qualify clipped landmarks and core/halo extraction before Task 3. Actual route `headWorld` is local buffer space; qualify mesh matrix/transform before world-coordinate assertions. No runtime geometry/surface changes were made in this recovery batch. Roboto hook findings remain unsuppressed pending actual reference-font verification; no intentional exception was invented.

2026-09-30 resumed Task 2: implemented loader animation-age correspondence in
`measurement-contract.mjs` and `compare-captures.mjs`. Recording seeks cannot
qualify animation age. `qualification-contract.json#loaderPhaseContracts`
must contain independent source/local onset evidence, one-frame age intervals,
overlapping ages, and matching run/state/recording/reference/local image pins.
Unmatched loader inputs now block structural qualification while retaining
numerical failures as diagnostics. Ruling: require animation-onset age rather
than infer navigation age from MOV time — the recording starts on the settled
landing before the loader appears; assuming an offset would misorder graphics
repairs. Cost: loader metrics remain unqualified until onset evidence exists.

Fresh verification: measurement contracts **54/54** (four new cases failed
before implementation), comparison-script syntax and diff whitespace checks
passed. Saved packet comparison with the reviewed source overlay retained
**15/15 provenance passes**; raster **15 fail**, structural **8 fail/7 blocked**,
DOM **10 pass/3 fail/2 N/A**. [New comparison report](../../apps/pegasoft-e2e/test-output/hero-reference/runs/4c1c48b5-98a6-4a61-9ecf-02a503e7f27f/comparisons/3be09780-fbc8-4810-bbcd-2896c8d890b3/comparison-report.json).
The comparison command correctly exited nonzero; no new capture was run.
Task 2 remains active/unqualified. Next: obtain independently reviewable loader
animation-onset evidence for the existing source/local anchors, then resolve
clipped-landmark and core/halo extraction. CSS rules and recording seek alone
cannot prove the exact source animation clock. Do not populate phase contracts
from guessed offsets, widen selection support, or begin Task 3 using these
blocked metrics. Five-hour usage at resumption: **1%**, weekly **16%**; prior
pause has cleared, no reset credit redeemed.



---

### Current phase evidence

2026-09-30 branch-finishing checkpoint: Phase 16 remains open. Added cool ambient
fill, corrected linear-to-display color conversion in the original ground shader,
and grounded each landing landmark with static contact falloff. Replaced inset
floor stacks with continuous neighboring towers, added office window rows and
service buttresses, removed an extra left building, and projected revised centers
through the existing landing camera from the locked recording. These are original
candidate meshes, not accepted silhouette/material equivalents. Ordinary landing
and first-scroll renders were inspected at 1280×720; the measured canvas backing
was 2240×1260. Source facade/reflection fidelity and complete motion remain open.

Fresh checks: 238/238 app tests, both typechecks, app lint, production build,
diagnostics build, and shipping/context-loss smoke 4/4 passed. E2E lint passed
with 38 existing warnings. App lint now excludes the generated
`.next-lifecycle-review` directory; no source rule was suppressed.

The user authorized one bounded capture after stopping the earlier run. It
completed with 6/15 passed and 9/15 failed (loader-mark, world-reveal, landing,
landing-idle, clearance-field-preview, field-contact, field-pulse-a,
field-pulse-b, journey-exit). The profile mismatch is resolved, but the harness
still assumes requested labels/clocks control actual output: controller
`referenceState` derives from physical input and ordinary lifecycle, while
`captureRequest` only selects target input and `__heroTime` does not freeze
effect clocks. It also requires a canvas during loader-mark. The failed run
has no complete capture manifest and must not be compared as an accepted packet.
Failure traces: `/private/tmp/hero-rebaseline-failed-capture-2026-09-30T1153`;
pre-run outputs: `/private/tmp/hero-rebaseline-pre-capture-2026-09-30T1152`.
Capture and diagnostics server are stopped. Next: preview the capture-contract
repair around physical input, applied-frame clocks, and source-owned loader
surface requirements before editing; then obtain a fresh complete packet.
Phases 17–19 and branch integration remain unqualified.

- Phase 2: [2026-09-28 lifecycle results](phase-02/2026-09-28-lifecycle-review/results.json)
  report 16 passed, zero failed/skipped/flaky, including delayed resources,
  deadline/resume, remount, Canvas failures, loader clearance and menu focus.
  Command: `NEXT_DIST_DIR=.next-lifecycle-review S6_PORT=4315 pnpm nx run @site/pegasoft-e2e:hero-repair-lifecycle`.
  This used installed Chrome, Next development mode and an isolated output
  directory/port. Four viewport checks ran in the desktop Chrome context;
  they are not physical-device or Android-browser qualification.
- The earlier default Playwright-browser failures remain unresolved evidence.
  They do not yet establish a broken deadline timer: the same lifecycle source
  passed the established Chrome suite without added watchdogs. Prior claims
  that timer additions or loader revealing flags proved a causal fix are
  withdrawn; static typecheck/lint could not establish those claims.
- Phase 2 comparison: bundled Chromium 148 ran the same two cases under the
  isolated configuration. [First pass](phase-02/2026-09-28-lifecycle-review/chromium-before/results.json)
  failed 2/2, but captured fallback at 15,000.9ms and remount ready at 5,270.1ms.
  Browser-side observation (unchanged budgets and retained assertions) made
  remount pass in the [second pass](phase-02/2026-09-28-lifecycle-review/chromium-observer/results.json).
  Atomic CSS/DOM observation made deadline/loader pass at 15,001ms in the
  [third pass](phase-02/2026-09-28-lifecycle-review/chromium-final/results.json),
  while the next case failed before initial scene diagnostics mounted.
  The three-pass batch stopped with 1/2 passing; no timer/renderer correction
  was made. The observation helpers are provisional, not suite qualification.
  The test configuration now permits explicit Chrome/Chromium comparison, and
  failures attach browser version, attempt timestamps and loader CSS/animations.
- Phase 5: the three previously failing named-state executions now pass using
  loader clearance, physical wheel input, applied-frame field clocks, and
  same-frame consumer checks: 3 passed, 1 intentionally skipped mobile
  duplicate. No expected-output or local-clock injection was introduced.
- Phase 15: per the user's 2026-09-28 gate reduction, the focused desktop test
  completed normal (3.6s), slow (7.2s), fast (0.9s), and reverse (3.6s)
  journeys with monotonic physical progression, endpoint convergence, settled
  rendered frames, and same-frame consumer application: 1 passed. Jump,
  resize, stationary-effect, and native-restoration completeness are not
  required for this phase pass.
- Phase 18: menu/focus checks passed in the established Chrome run; previously
  failing default mobile-profile cases remain to be reproduced and diagnosed.

The Phase 2 lifecycle review itself promoted no baseline phase. Its development
results remain supporting evidence and do not close production, responsive,
graphics, or final user-acceptance gates. The later Phase 5 and Phase 15
promotions are recorded separately above from their focused evidence.



---

## Historical repair work and evidence

The R1–R4 instructions and recovery sequence below preserve the decisions made
during earlier repair work. Their stop/go and authorization language describes
those checkpoints only. The canonical tracker and numbered phase gates govern
current work; later user instructions authorized progression through Phase 19.

Before visual phase implementation, execute the
[foundation repair sprints S0–S8](repair-sprints.md), tracked in
the [sprint ledger](repair-sprint-ledger.json). They make R1,
R2, R4, and the foundation parts of A04/A06 measurable subagent assignments.
The user has authorized their execution; S0/S1/S2/S4 passed independent review and
S3/S5 are accepted after independent review. S6 is independently accepted within
its bounded lifecycle and visible-DOM scope, with 16/16 browser cases, 5 lifecycle
tests, and both typechecks passing. Its development-Chrome, emulated-resume,
production-equivalence, physical-device, and final-visual-fidelity limitations
remain explicit. S7 is accepted within bounded repair scope at 336/336 after
the v5 packet's strict validation, complete manifest/handover, and independent
APPROVE. The historical three-pass failures, 71-pass sharded stop, and v4
0/336 qualification state remain preserved as historical evidence. S8 is
qualified within bounded technical scope: the strict matrix is 336/336
applicable, 24/24 predeclared N/A, shipping/context-loss smoke is 4/4, and
the focused closure review passed. This does not claim final visual fidelity,
representative-hardware acceptance, or personal visual approval. The canonical
tracker above is now the sole source for baseline phase order and status; R3's
failed visual slice is retained below as historical evidence and implementation
context.
The ledger tracks actual dependency acceptance and assignments, not inferred
completion.

R3 below is retained as historical post-repair visual evidence. It is not a
progress tracker, a prerequisite label, or permission to claim any baseline
phase complete.

### R1 — repair progress and rendered-motion truth

Addresses audit A01, A02, A05; Phases 1, 5, 6.

1. Derive DOM progress and scene target separately from physical page scroll.
   Remove the capture-fitted curve from normal runtime mapping. Preserve
   scene movement during the first 0.4 viewport heights of scroll.
2. Give camera, route reveal, contact, field, and arrival one shared rendered
   frame state. Keep source-confirmed target-driven exceptions explicit.
3. Replace label-only convergence with actual camera/route/effect evidence.
   Direct-state controls must not force the expected copy step.
4. Verify slow/fast forward scroll, reversal, jumps, resize, stationary local
   effects, and genuine browser scroll restoration around every threshold.

Stop: review a normal-playback comparison and a rendered-state trace. Do not
start camera fitting until source and local states mean the same thing.

### R2 — repair route roles and landing occlusion

Addresses A03, A08; Phase 7.

1. Preserve the user-accepted coordinates and label each path by its purpose.
2. Reuse the activation feeder geometry for landing idle packets, as the
   source does. Remove the camera-fitted landing-only network.
3. Restore depth-correct packets and validate their draw/retract behavior.
4. Validate source/local route classifiers visually. Separate physical tube
   radius, visible core, and glow; do not shrink geometry to satisfy a
   classifier measuring a different color band.

Stop: review landing-idle and activation side-by-side, including occlusion and
moving contact. Shared file ownership alone is not route consistency.

### R3 — first post-repair landing graphics slice

Addresses A04, A06; a bounded combination of Phases 8–11, 16, 19.

1. Use the source runtime camera/FOV as the starting constraint. At settled
   landing, our current pose already matches that formula; do not move it to
   compensate for inaccurate city geometry.
2. Match the visible city layout, building silhouettes, turbine scale,
   ground coverage, routes, and depth relationships.
3. Establish representative final materials, soft shadows, reflections,
   surface response, antialiasing, and beam core/glow now.
4. Include normal landing motion and its transition into activation. Check a
   second desktop viewport and an initial representative-hardware cost profile.

Stop for personal visual review before expanding to the remaining scenes.
This is the first reviewable graphics-quality checkpoint, not whole-hero
acceptance. Final-quality evidence cannot be obtained from proxy boxes alone.

#### R3 visual review disposition — 2026-09-28

The initial reviewable slice is retained as working material, but it did not
pass the personal visual review. Its implementation is not a baseline for the
remaining scenes and must not be extended by adding more approximations. The
next pass returns to the authoritative reference and recalibrates the complete
landing-to-activation handoff as one bounded slice: loader/reveal ownership,
settled first-landmark composition, idle red feeders, first-scroll transition,
blue-route construction and animation, and the third-landmark arrival/pulse
relationship. The source camera and accepted route knots remain constraints;
they may only be changed when a new source/local correspondence proves the
constraint is the cause.

The previous cost assessment remains diagnostic only. At this checkpoint,
later scene work was withheld; subsequent user instructions authorized scene
progression and Phases 15–19. This historical restriction is superseded.

### Post-review visual recovery sequence (work breakdown only)

This is an implementation work breakdown, not a status mechanism. It does not
override the canonical baseline-phase tracker above or promote observations
into additional acceptance criteria.

1. **Re-establish the landing boundary (Phases 8–10).** Lock the source
   reload-to-settled frame, loader readiness event, reveal order, first
   landmark screen-space bounds, negative space, and idle feeder visibility.
   Prove that the loader owns the page until the actual Canvas is ready and
   that the settled landing owns the viewport afterward. Capture two desktop
   widths before changing geometry.
2. **Calibrate the first transition (Phases 9–11).** With the landing frame
   locked, match the first scroll interval as a continuous handoff. Calibrate
   red feeder separation, beam core/glow, contact order, and camera movement
   from source frames and live traces. The interval must be isolated from
   later journey routes; no later route may be used to hide an early overlap.
3. **Rebuild the blue route from source semantics (Phases 11–12).** Use the
   accepted route controls, sampling, elevation, and scene range as inputs,
   then tune its projected centerline, texture/material response, core/glow,
   pointer/contact attachment, and temporal interpolation together. Validate
   dense motion, reversal, jumps, and stationary local effects so smoothness
   is measured in rendered output, not inferred from state values.
4. **Rebuild the third-landmark arrival (Phases 13–14).** Match the landmark
   silhouette, block layout, depth, contact, pulse envelope, cadence, and
   pointer/beam attachment as one composition. Verify entry and exit neighbors
   before accepting any pulse or arrival effect in isolation.
5. **Run the complete journey only after all slices pass (Phases 15–16).**
   Recheck normal, slow, fast, reverse, jump, resize, native restoration,
   reload, and stationary-effect behavior. Then perform shared graphics
   refinement across the accepted slices; any shared change reopens the
   affected visual and motion gates.
6. **Qualify delivery constraints (Phases 17–19).** Validate responsive
   profiles and accessible alternatives from the accepted compositions, then
   run locked production performance, cleanup, provenance, and final personal
   review. A passing technical packet cannot substitute for the visual gate.

Each step stops on a matched normal-playback comparison, rendered-state trace,
and explicit personal review of that slice. If a slice fails, keep later phases
closed and change only the causal layer identified by the comparison.

#### R3 recovery checkpoint — 2026-09-28

Implemented the first bounded recovery pass in the active renderer:

- loader reveal/hide now requires an actual ready applied frame, with the
  reference-aligned minimum reveal window reduced from the previous unconditional
  elapsed-time hide;
- activation-world geometry is withheld at settled landing progress so later
  turbines/proxies cannot bleed into the first landmark composition;
- landing-only landmark geometry is isolated and reduced in scale for continued
  screen-space calibration; route control points and blue/red route consumers
  were not changed.

Focused checks passed: typecheck, lint, and 43/43 hero frame/model/sequence
tests. Live browser inspection confirms the loader clears after ready state and
the activation world is no longer present at scroll position zero. The landing
silhouette and idle-packet placement remain under visual calibration.

The next blue-route pass has now started without altering the accepted route
controls: blue tube sampling was increased from 100 to 180 segments, and the
pointer endpoint is quantized to the same rendered tube endpoint to prevent
detachment. Focused typecheck/lint and 44/44 frame/model/route-rendering tests
pass. R3 remains unaccepted; the Phase 11–12 blue-beam observations remain
review evidence and are not immediate fixes.

The Phase 11–12 blue-beam visual observations remain open and were not used as
immediate fixes. Phase 13–14 added an explicit cyan arrival feed between the
accepted blue-route endpoint and the arrival arrow lockup, with source-range-
aligned reveal and rendered-frame diagnostics. The subsequent Phase 13–14
visual review reported no new observations, so the correction course advances
to Phases 15–19.

### R3 correction-course checkpoint — 2026-09-28

Historical evidence only: the homepage suite returned 18 passed, 3 failed,
1 skipped (22 cases); this was not 21 complete-journey convergence tests.
Shipping smoke returned 4/4 against an existing build, without a fresh build
binding to the visual changes. Alternatives returned 24/32 in the default
browser configuration. These results alone do not qualify the current build.
Safety failures belong to Phase 2, named-state harness reconciliation to
Phase 5, and accessibility failures to Phase 18; Phase 15 depends on them.

### R4 — close profile, failure, and evidence gaps before R3

Addresses A07, A09, A10; Phases 1–2, 5–6, 17–19.

S0 resolved the source-resolution uncertainty: the reference itself uses the
same `1.75` desktop cap (`2639×1331` backing at `1508×761`, screenshot DPR 2),
with distinct narrow Android/iOS rules. Preserve verified caps; repair the
unsupported profile coupling and exact-recording styling. Source semantics
and fresh measurements are in the [S0 source contract](repairs/s0/source/source-contract.md).

1. Remove capture-resolution-specific production styling. Resolve actual
   responsive/input/device rules and test adjacent viewport sizes.
2. Measure actual Canvas backing resolution and quality, not screenshot DPR
   alone. Agree any device-quality compromise explicitly.
3. Prove startup/readiness and useful fallback on the actual Canvas, including
   initialization failure and context loss, in a production build.
4. Correct comparison gate semantics and report provenance; retain historical
   runs as history instead of upgrading their scope.

The sprint dependencies govern R1/R2/R4 execution and safe parallel work.
Complete their repair qualification before R3; then stop for the user's phase
decision. Do not delay essential accessibility until the end. Representative
graphics/performance feasibility begins in R3, not at final cutover.



---

## Superseded operational index — 2026-09-30

Historical snapshot only: its pause, failure and next-action statements are
superseded by [CURRENT.md](../ledger/CURRENT.md). Earlier session usage findings
remain retrospective evidence, not a current account snapshot.

# Pegasoft current work packet

Read this file first. It is the compact operational index; detailed evidence is
loaded only when a linked claim is being verified.

Updated: 2026-09-30

## Last-session efficiency finding

The referenced 20m28s session produced 54 response records on Astra: 11,905,540
tokens total, 11,661,440 cached input, 238,613 uncached input, and 5,487 output
tokens. It averaged about 220K tokens per response and spent 30 execution calls
plus 23 waits. Cached input still counts toward the usage window. Do not repeat
this pattern; use one owner, compact context, and no polling loop.

## State

- S7: accepted within bounded repair scope — 336/336 applicable cells, 24/24
  predeclared N/A, 60/60 shards, 672 images, fresh shipping/context-loss
  smoke 4/4. This is not final visual fidelity or R3 authorization.
- S8: qualified within bounded technical scope. The sealed technical packet is
  green: strict matrix 336/336, 24/24 predeclared N/A, fresh
  shipping/context-loss smoke 4/4, and focused closure review passed.
- Current phase status and next action: see the canonical baseline-phase
  tracker linked below. Phase 15 is accepted under the user-approved
  normal/slow/fast/reverse completion set, Phase 16 is blocked on capture qualification, and Phase 2
  is deferred open outside the current execution path. R3 and sprint labels
  are historical evidence groupings; they do not impose separate authorization
  or completion gates.
- 2026-09-28 Impeccable hero critique: dual assessment 21/32 across eight
  applicable Nielsen heuristics; the CLI detector returned `[]`. Desktop was
  inspected at 1280×720; mobile screenshots and fresh load timing were not
  verified. Phase 16 remains open. The next visual action is a matched
  landing-to-activation reference comparison; process semantics and motion cost
  are recorded as separate findings in the critique snapshot.
- 2026-09-28 Phase 16 landing-to-activation candidate: restored full-size
  landing landmarks in world space, moved them below the headline, and kept
  nearby turbines/workers mounted across the first scroll handoff. Nx
  typecheck, 238/238 app unit tests, and `git diff --check` passed. Nx lint
  remains blocked by 19,345 errors in generated `.next-lifecycle-review`
  output; this run does not establish source lint status. Live localhost
  review showed the fuller landing and first-scroll context, but
  final desktop reference match, motion/performance profiling, and personal
  visual acceptance remain open. Next: compare the rendered landing and
  activation silhouettes/materials to matched reference frames, then run
  affected structural/motion gates after any further shared graphics edits.
- 2026-09-29 Phase 16 landing craft: compared the saved Vectr settled frame
  with a 1280×720 localhost render and repositioned six landing buildings
  into the lower visible field using the unchanged source camera. Added
  stepped masses, facade rhythm, roof parapets, and equipment; removed noisy
  small-detail shadows. The latest browser render clears the headline and
  body. Nx typecheck, 238/238 unit tests, and diff whitespace check passed.
  The 1440×900 render and settled local first-scroll frame were also inspected;
  the landing remains clear at the second width and the activation beam renders.
  This is a candidate: matched first-scroll reference motion, cost profile,
  structural/motion gates, and personal visual acceptance remain open. Next
  compare matched first-scroll frames and measure the render cost.
- 2026-09-29 Phase 16 continuity and destination slice: activation structures
  no longer switch on at a progress threshold. The visible set now contains
  the destination and nearby yard context, avoiding overlap with landing
  landmarks; the destination has a more specific roof, facade, and emblem.
  Process controls announce current/expanded state and their descriptions.
  Local 1280×720 settled landing and forward scroll were inspected; Nx
  typecheck and 238/238 app tests passed. Nx lint is still blocked by 19,345
  generated-output errors. Source-matched motion, lighting,
  material quality, frame cost, second desktop width, and personal visual
  acceptance remain open. See the baseline plan for the next action.
- 2026-09-30 Phase 16 reference-size candidate: matched local landing/contact
  at 1508×761, added destination workers, trees, and soft ground falloff, and
  removed the landing landmark cutoff. Normal forward/reverse playback was
  inspected. App typecheck, 238/238 tests, e2e typecheck, production build,
  and diff check passed. Nx visual capture remains blocked after three setups:
  HMR WebSocket error, absent production diagnostics, then an expected
  `recording-desktop` versus actual `desktop` profile mismatch. Phase 16 is
  still open; see the baseline plan for the next gate and remaining fidelity.
- 2026-09-30 branch-finishing checkpoint: continuous landing towers, projected
  placement, office details, cool fill and color-correct ground falloff are
  candidates. Fresh tests 238/238, both typechecks, app lint, production build,
  and shipping/context-loss smoke 4/4 passed; E2E lint has 38 warnings. The user
  authorized one bounded capture: 6/15 passed, 9/15 failed. Its requested-label
  and clock assumptions conflict with the physical-input/applied-frame runtime.
  Phase 16 is blocked on that contract repair; Phases 17–19 and integration
  remain unqualified. Capture/server stopped; failure traces and next action
  are recorded in the canonical baseline plan. Daily five-hour usage policy
  remains authorized; no reset credit was redeemed.
- 2026-09-30 failed-state audit: the canonical plan now distinguishes lifecycle
  observation races, late physical-state acquisition, pulse diagnostic drift,
  and worker restarts deleting artifacts. Traces contain a loader canvas; its
  absence is not established. A six-task recovery plan covers reliable evidence,
  geometry, surfaces, continuous motion and Phases 17–19. No runtime edits or
  new captures were made. Implementation authorized. Task 1 acquisition passed 15/15 in immutable run `31515db9-ab30-430e-9721-669be939d945`; Task 2 provenance and correspondence are active. Capture acquisition is not visual acceptance.

- Latest recovery checkpoint: daily five-hour usage96% pauses execution. Task1 capture complete; fresh run `4c1c48b5-98a6-4a61-9ecf-02a503e7f27f` has 15/15 captured and 15/15 strict provenance passes. Task2 correspondence remains unqualified; source component overlay independently verified, loader phase and clipped/core-halo measurements remain open. See canonical plan for exact extaction; Tasks 3–6 not started.

## Authoritative links

- 2026-09-30 Task 2 resumed: added an independent loader animation-age gate;
  seeks and stale/self-reviewed phase records cannot qualify loader geometry.
  Measurement contracts 54/54 passed after four new RED cases; syntax and
  whitespace checks passed. Existing packet provenance remains 15/15;
  reviewed-overlay comparison reports structural 8 fail/7 blocked, raster
  15 fail, DOM 10 pass/3 fail/2 N/A. No new capture or runtime graphics edit.
  Task 2 remains unqualified; next establish source/local animation onset,
  then resolve clipped landmarks and core/halo correspondence. See the
  canonical plan for the report and exact evidence requirements. Five-hour
  usage resumed at 1%; weekly 16%.

- [Sole live status and phase plan](../pegasoft-hero-baseline-plan.md)

- [Sprint ledger](repair-sprint-ledger.json)
- [S7 status](repairs/s7/status.md)
- [S8 final review](repairs/s8/runs/2026-09-25-requalification-2/independent-review.md)
- [S8 handover](repairs/s8/runs/2026-09-25-requalification-2/handover.md)
- [Usage policy](../pegasoft-codex-usage-memo.md)
- [Document index](../ledger/INDEX.md)
- [Impeccable hero critique](../../.impeccable/critique/2026-09-28T17-03-03Z__apps-pegasoft-src-app-shared-pegasoft-home-tsx.md)
- [Extracted design vocabulary](../../DESIGN.md)

## Execution rule

The baseline plan is the sole live status authority. Preserve the green matrix,
smoke, review, and historical artifacts. Update that plan and the existing
ledger references when baseline phase status changes; do not create a competing status
report.
