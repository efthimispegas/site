# Hero foundation audit — Phases 1–7

Audited: 2026-09-15. Implementation: `f47854d` on
`codex/hero-reference-rebaseline`. This is a source, contract, and existing
capture audit; it does not claim a new visual acceptance run.

## Verdict

The accepted source knot coordinates survive this audit. The broader claim
that Phases 1–7 provide a completed foundation does not. Normal scroll mappings,
rendered-progress ownership, landing-route geometry, and the acceptance harness
have defects that would undermine subsequent camera fitting.

Retain the recording, source measurements, legacy deletion, scoped modules,
dependency ownership, and test infrastructure. Reopen the affected gates. No
visual phase is accepted, and no numerical pass total represents a percentage
of visual completion.

The user confirmed the source knots. This audit preserves that decision and
narrows the implementation claims that had incorrectly grown around it.

## Evidence and limits

- Authority: [current Vectr hero](https://www.vectrfl.com/) and
  [the supplied recording](../vectrfl_recording.mov).
- Current application bundle: [CommonScripts](https://www.vectrfl.com/_astro/CommonScripts.astro_astro_type_script_index_0_lang.CZTi642d.js),
  120694 bytes, SHA-256
  `352de1ba99e915be04f929107ffcfbfa2893b943bf0b60ae1d74006fa1e36494`.
  It was downloaded and inspected during this work; its bytes match the
  recorded source evidence. Source symbols below identify observations in
  these bytes, not dependencies for the replacement application.
- Current scene metadata: [desktop GLB](https://www.vectrfl.com/glb/nuclear_staffing_noHumans.glb),
  2190704 bytes, SHA-256
  `4e33ca95ac15dde3f9efe6803a09031c406ef9eeaa6bd7012450d8e770469ba3`.
  Only metadata was inspected; no source mesh or shader was added to the app.
- Existing recording comparison: capture run
  `a779ce20-e41c-44f8-845a-50d9cda9ddea`, completed
  `2026-09-15T10:41:49.978Z`; structural states `0 pass / 15 fail / 0 blocked`,
  route checks `14 pass / 70 fail`, DOM states `13 pass / 0 fail / 2 N/A`.
- Fresh audit check: `pnpm nx run @site/pegasoft:test -- --run` passed all
  42 tests in five files with Node 24.19.0 and pnpm 10.8.1. This demonstrates
  that the existing tests do not detect the defects below.
- Read-only execution of the current sequence/camera modules produced the
  progress examples below. Source inspection found no reintroduced legacy
  renderer/import/switch in Pegasoft. A fresh production build, complete
  browser suite, physical-device run, and performance acceptance were not
  repeated in this documentation audit.

## Findings

### A01 — P1: physical scroll, DOM progress, and scene target are conflated

Affected: Phases 5–6.

[hero-controller.ts:214](../../apps/pegasoft/src/app/shared/hero-scene/hero-controller.ts#L214) calls `getDomStepSnapshot(sceneTargetProgress)`.
The live bundle's flow handler uses separate formulas. With viewport height
`H` and flow scroll range `R`:

```text
DOM progress   = clamp((scrollY - 0.4H) / R, 0, 1)
scene target   = max(0, scrollY / (0.4H + R × 400/356))
```

Our [hero-sequence.ts](../../apps/pegasoft/src/app/shared/hero-scene/hero-sequence.ts) clamps the input to zero for the first `0.4H` scroll
pixels, then interpolates a curve fitted to selected capture anchors. It
cannot recover scene movement from an input that has already been clamped.
The same scene result then selects the DOM step, using thresholds that belong
to the other progress domain.

Read-only reproduction with the captured `1508×761` page geometry,
`flowHeight=3470.15625` and `R=2709.15625`:

| Scroll Y | Local scene | Source scene | Local step | Source step |
| -------: | ----------: | -----------: | ---------: | ----------: |
|      100 |           0 |     0.029865 |          1 |           1 |
|      304 |           0 |     0.090790 |          1 |           1 |
|      700 |    0.209067 |     0.209055 |          2 |           1 |
|     2250 |    0.671954 |     0.671964 |          2 |           3 |

The scene is frozen during early scroll and process steps change at the wrong
positions later. Direct-state entry overrides `processStepIndex` and
`copyState`, so the 13 passing DOM captures cannot validate this mapping.

Required fix: derive both domains directly from one physical measurement;
verify their source formulas at boundaries and during ordinary scrolling.
Treat recording-selected progress as capture data, not an authored easing curve.

### A02 — P1: camera and scene effects use different progress clocks

Affected: Phases 5–7.

[hero-camera.tsx:53](../../apps/pegasoft/src/app/shared/hero-scene/hero-camera.tsx#L53) damps progress every frame. [hero-beam.tsx:132](../../apps/pegasoft/src/app/shared/hero-scene/hero-beam.tsx#L132),
[stages/activation.tsx](../../apps/pegasoft/src/app/shared/hero-scene/stages/activation.tsx), and [stages/field-match.tsx:56](../../apps/pegasoft/src/app/shared/hero-scene/stages/field-match.tsx#L56) use the immediate
`sceneTargetProgress`. Arrival's material activation alone consumes the
camera's rendered progress ref. During fast scroll/reverse, the beam and field
can arrive before the camera or reset before it departs.

In the audited live `onRaf`, red/blue reveal, field composition, grid ratio,
and arrival ratio derive from `cameraProgress`. Its idle spawning condition
uses target progress zero; these are deliberately distinct inputs.

Required fix: one frame state must distribute the actual rendered progress,
route samples, and effect gates. Preserve explicit target-driven exceptions.
Test synchronization while moving, not only after settlement.

### A03 — P1: landing rails are a separate invented network with disabled occlusion

Affected: Phases 5 and 7.

The live `_createIdleRedLines` iterates `zr`, the same four feeder controls
used by activation. Idle differences are range/time changes. In our code,
`HERO_LANDING_RAIL_PATHS` in [hero-route.ts:108](../../apps/pegasoft/src/app/shared/hero-scene/hero-route.ts#L108) is a separate set fitted to
the previous camera. [hero-landing-rails.tsx:132](../../apps/pegasoft/src/app/shared/hero-scene/hero-landing-rails.tsx#L132) additionally sets
`depthTest={false}`; the inspected localhost image shows rails painted over
building faces. The reference packets are spatially occluded by buildings.

Also, `RED_CAMERA_PATH_SOURCE` is a camera look-at trajectory. It is not a
single rendered red trunk: the visible red routes have four distinct contact
positions. The 31-to-40 resampling applies to blue route zero, not every
route. Synthetic route fractions `0.25/0.75` are our API, not source timing.

Required fix: retain the verified coordinates with explicit roles; share the
feeder geometry for idle/travel and restore depth-correct rendering. Remove
the invented landing paths after replacement tests/captures. Test rendered
consumers and sampling modes rather than declaring every consumer identical.

### A04 — P1: a camera-first diagnosis would compensate for the wrong cause

Affected: Phase 7 interpretation and proposed Phase 8.

At settled progress zero, the live frame formula and our camera model both
produce position `[-80,66,15]`, target `[-50,0.15,-35]`, and vertical FOV
`14.4262925614°` at the recording aspect. The GLB's authored camera/pivot
transform is not the final runtime pose: the live frame callback overwrites
position and orientation. The GLB FOV is useful evidence.

The existing landing overlay shows different building shapes/positions,
missing context, oversized turbines, different surface response, and wrong
occlusion. A shifted edge centroid does not identify the camera as the cause.
The audit's initial camera-first diagnosis is withdrawn.

The same risk exists in the accepted `recording-field-preview-precedes-live-
activation-range` decision: [hero-field-model.ts](../../apps/pegasoft/src/app/shared/hero-scene/hero-field-model.ts) changes visibility over
`0.50–0.54` while the source grid ratio uses `0.72–0.75`. The decision assumes
the selected progress/camera and interpretation of that ratio are correct;
the differing source/recording state has not been resolved by those facts.
The function also applies globally, despite the decision naming a recording
profile. This is a provisional compensation, not established source behavior.

Required fix: establish camera, geometry, material, and time correspondences
independently; change one factor at a time. Resolve live/recording differences
with aligned traces. Reopen unsupported visibility compensation. Source
camera facts remain testable constraints, not an absolute ban on measured
corrections supported by stronger evidence.

### A05 — P1: harness success does not establish rendered experience parity

Affected: Phases 2, 5, and 6.

[pegasoft.spec.ts:277](../../apps/pegasoft-e2e/src/pegasoft.spec.ts#L277) reads DOM diagnostic attributes for its convergence
signature. Its forward/reverse/jump test compares that signature at raw
progress `0.74`, not camera matrices, beam position, local clocks, or pixels.
The repeated screenshot test checks one direct-injected field state twice.
The reload test explicitly restores scroll with `window.scrollTo`, which
does not test native restoration timing.

[hero-reference.visual.ts:314](../../apps/pegasoft-e2e/src/visual/hero-reference.visual.ts#L314) checks a ready attribute and waits two animation
frames; it does not verify the applied camera pose or effect phase.
`createHeroJourneySnapshot` forces direct-state copy/step and bypasses normal
DOM presentation. `animations: 'disabled'` further excludes live CSS timing.
The standard Playwright configuration starts `next dev`, so its successful
smoke run is not a production-browser smoke result.

Required fix: preserve useful direct captures, add normal-entry equivalence
and transition traces, record actual camera/effect state, and explicitly run
production smoke. A frozen-state pass and an experience pass are separate gates.

### A06 — P1: the old phase order has circular gates and postpones graphics risk

Affected: Phases 1 and 5–7, and downstream scheduling.

The old Phase 8 requires every anchor to pass copy/landmark/route/negative-
space tolerances before Phase 9. Yet the landmark geometry is rebuilt in
Phases 11–14, typography/materials in Phase 16, and normal chronological
playback only in Phase 15. These changes affect the very measurements being
declared frozen. Landing's disconnected/clipped city was replaced as a primary
gate by a coarse 4×4 Sobel distribution; this cannot establish individual
building layout or production-quality graphics.

[hero-world-layout.spec.ts:40](../../apps/pegasoft/src/app/shared/hero-scene/hero-world-layout.spec.ts#L40) locks arbitrary minimum structure counts and
maximum footprints. Its ground test checks only `size >= 1000`; it casts no
frustum rays and proves no world-edge coverage. These tests can preserve an
incorrect candidate while the old plan calls it accepted.

Required fix: build a representative landing slice with accurate proxy
silhouettes, depth, materials, soft shadow/reflection, and motion early. Allow
bounded iteration between camera and geometry with separate evidence. Verify
each interval as it is built. Retain Phase 16 for final refinement, and run
graphics/performance feasibility before multiplying scene detail. Permit
independently authored meshes/baked data/instancing; procedural boxes are a
tool, not the required final asset strategy.

### A07 — P1: the final acceptance definition and identity gate are inconsistent

Affected: Phases 1, 5, and 6.

The old accuracy definition allows deviations if they are merely
"explained." Your target requires correction or explicit user-approved
exceptions. Documentation is not approval.

The plan allows Pegasoft wording/identity, but [compare-captures.mjs:2975](../../tools/hero-reference/compare-captures.mjs#L2975)
ANDs the unmasked preliminary raster result into `gateSatisfied`. The raster
contains all differing words/logos and no valid identity mask. It is described
as diagnostic while functioning as a final blocker. Conversely, passing DOM
rectangles does not validate visible glyph layout; existing screenshots show
the first CTA clipped and the scroll cue wrapped despite DOM passes.

Required fix: define separate scene, product-copy, motion, and final-review
gates. Keep full images visible. Use only proven identity exclusions, or
mark the identity-sensitive raster diagnostic non-gating while retaining
explicit scene and text-layout checks. Never hide scene pixels with text-box
masks. Preserve branding unless the user changes that requirement.

### A08 — P2: color-selected measurements can reward the wrong rendering

Affected: Phases 1 and 7.

[screen-structural-features.mjs](../../apps/pegasoft-e2e/src/visual/screen-structural-features.mjs) selects saturated cyan in the source and
near-white cyan in localhost. Their selected support/thickness is not the
same physical quantity. Light field tiles and contact/pulse effects can alter
the selected set. Landmark selectors also contain local-composition ROIs and
size gates. Independently selecting pixels avoids copying a source mask, but
does not make these algorithms invariant to camera or material changes.

Phase 7 changed blue radius from `0.125` to `0.035` using these measurements;
the source uses `0.125` with a different shader/emission pipeline. That tuning
is an experiment, not proof of the correct tube width. The latest aggregate
route pass count fell from 16 to 14.

Required fix: validate classifier output on displayed full-image overlays,
including clipped, missing, recolored, and pulse-overlapped cases. Distinguish
geometry centerline, visible core, and glow envelope. Add projected geometry/
object-ID diagnostics for localhost without treating them as source evidence.
The four approved source masks remain refinement inputs; their IoUs cannot
independently accept a landmark or the whole hero.

### A09 — P2: responsive and render-quality assumptions are being treated as rules

Affected: Phases 1, 5, and 6.

[hero-profile.ts:22](../../apps/pegasoft/src/app/shared/hero-scene/hero-profile.ts#L22) recognizes exactly `1508×761` as a runtime profile;
[hero-world.tsx:20](../../apps/pegasoft/src/app/shared/hero-scene/hero-world.tsx#L20) changes ground color only there. A one-pixel resize changes
appearance. This is a capture-specific production behavior, not a reference
breakpoint. The fixed `500svh` tablet flow and shared mobile/tablet mapping
are candidates. Source evidence says the lighter asset is selected by the
iOS branch; it does not prove that all mobile devices use it.

The recording screenshot is DPR 2, but localhost caps Canvas DPR at 1.75
([hero-profile.ts:67](../../apps/pegasoft/src/app/shared/hero-scene/hero-profile.ts#L67)); the captured backing store is `2639×1331` versus a
`3016×1522` screenshot. Screenshot DPR equality alone does not lock rendering
resolution or prove reference render-quality parity.

Required fix: separate capture metadata from production profile behavior,
measure actual source/local backing resolution, and validate continuous
resize plus real breakpoint states. Establish the quality budget before
lowering resolution. Distinguish CSS, pointer, device, and asset-selection rules.

### A10 — P2: readiness/fallback claims and current evidence are overstated

Affected: Phases 2–5.

[use-hero-controller.ts:46](../../apps/pegasoft/src/app/shared/hero-scene/use-hero-controller.ts#L46) probes a separate WebGL context at capability
updates. [hero-scene.tsx](../../apps/pegasoft/src/app/shared/hero-scene/hero-scene.tsx) selects Canvas from that result and has no runtime
context-loss/error handoff to `HeroFallback`. Forced fallback tests therefore
do not establish recovery when the active renderer fails. Loader milestones
in the controller/home are elapsed-time thresholds, independent of actual
scene readiness.

Evidence also drifted: the architecture report labels 11 copy envelopes and
two blocks while its newer summary claims 13/zero; the plan mixes capture run
IDs, unit counts, and route pass totals. Report "current checkpoint" labels
have outlived the tests that originally produced them.

Required fix: test initial WebGL failure, active context loss, delayed
readiness, reduced-motion updates, and production entry. Bind acceptance to
revision, source hashes, capture run, profile, and exact test scope. Do not
relabel stored results as freshly rerun. Keep test failures and unavailable
evidence distinct from visual mismatches.

## Phase disposition

| Phase | Audit disposition                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Keep source archive and useful measurements; reopen coverage, source-role interpretation, and final acceptance contract.               |
| 2     | Keep development mount/accessibility smoke; add real failure and production paths.                                                     |
| 3     | Retain legacy-severance acceptance; fresh source scan found no regression. Production revalidation remains a cutover check.            |
| 4     | Retain scoped CSS/package hygiene; new compensating rules remain replaceable.                                                          |
| 5     | Reopen rendered clock, readiness, and normal-entry equivalence gates.                                                                  |
| 6     | Reopen progress mappings, visible copy layout, and lifecycle behavior. Keep passing direct-state DOM measurements as limited evidence. |
| 7     | Keep user-confirmed source coordinates and blue resampling facts; reopen landing consumer/depth behavior and world/proxy acceptance.   |

## Repair order and concrete review points

Scheduling addendum: the user's subsequent request separates all foundation
repairs from new visual phase implementation. The
[repair sprints](./repair-sprints.md) now govern execution: S0–S8 qualify
R1/R2/R4 first, then stop before R3. The recommendations below retain the
audit's original grouping; they no longer imply that R3 precedes R4 repairs.

1. **R1 — progression and harness:** A01, A02, A05. Preserve physical input,
   split DOM/scene formulas, share rendered frame progress, compare real
   forward/reverse/stop/jump output against source behavior. Review a short
   synchronized source/local scroll clip and boundary report.
2. **R2 — route semantics and depth:** A03, A08. Replace the landing workaround,
   verify source curve roles and occlusion, separate core/glow measurements.
   Review landing/idle/activation side-by-side and in motion.
3. **R3 — landing graphics slice:** A04, A06, A07. Establish scene, visible
   copy, camera/proxy relationships, and a representative quality pipeline.
   Review raw source/local images and normal playback before expanding work.
4. **R4 — foundation closure:** A09, A10 and residual A07/A08. Validate resize,
   render resolution, fallback, production entry, and acceptance metadata.
   Resume the remaining Phase 8 anchors only after their relevant foundation
   dependencies are cleared. Continue frame-time checks throughout.

The audit changes documentation and acceptance status only. Runtime repairs
remain open work in the revised plan; the existing 42 passing tests do not
close them. Per the user's instruction, implementation is paused until written
confirmation after review of this audit.
