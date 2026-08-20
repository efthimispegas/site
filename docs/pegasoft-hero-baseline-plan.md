# Pegasoft Hero Baseline Plan

Status: implementation checkpoint; visual baseline is not accepted
Last reviewed: 2026-08-20

## Baseline verdict

Earlier completion claims remain withdrawn unless a gate below now cites fresh
evidence.

- Phase 0 preservation is accepted.
- Phase 1 remains not accepted. Deterministic recording analysis now measures
  seven landmarks, 12 visible route cores, 11 copy-ink envelopes, and one
  section boundary, plus fixed-grid screen-space composition proxies for all 15
  states. All 12
  applicable route states are measured; the loader, exact landing frame, and
  journey exit correctly mark route bounds not applicable. Eleven copy states
  are measured; the faded `arrival-travel` copy and clipped/header-overlapped
  `journey-exit` copy remain blocked rather than borrowing bounds from another
  frame. Four
  route/transition-primary states correctly mark landmark bounds not
  applicable; four genuinely landmark-primary states remain blocked rather
  than accepting partial or effect-only boxes. The three source-tied semantic
  masks completed their personal-review checkpoint and remain reproducible
  inputs, not visual acceptance. Locked
  landing and 11-state journey DOM profiles exist. The current
  manifest-verified capture passes all 13 applicable whole-ladder DOM states.
  The same atomic capture now emits all 15 implementation screen-composition
  records through the shared reference-measurement algorithm. Of 285 locked
  composition checks, 191 pass and 94 fail; these are measured mismatches, not
  missing evidence. The current capture also observes all 11 source-applicable
  copy-ink envelopes and the journey-exit section boundary through the same
  source-derived algorithms. Copy bounds pass 18/44 checks, while the boundary
  passes 4/4. Schema-v5 capture records also run all 12 authoritative route
  configurations against implementation screenshots. The two red activation
  routes are observed and expose 5 passing / 7 failing endpoint, thickness,
  and direction checks; the other ten routes select zero source-qualifying
  pixels and remain quality-blocked without relaxing the source predicate.
  The same capture emits landmark records for all seven source-observed
  landmark states. Transferable pixel methods observe `loader-mark`,
  `world-reveal`, and `arrival-lockup`; their center/size bounds pass 8/12
  checks. `field-pulse-b` has no source-blue support, while the three
  hash-locked source-mask landmarks remain explicit semantic-isolation blocks.
  Schema 10 now recomputes the shared masks from the locked source and
  manifest-verified implementation rasters. `loader-mark` and `world-reveal`
  emit true chroma-silhouette IoU evidence at `0.3987` and `0.6460`; both fail
  the locked `0.90` minimum. `arrival-lockup` emits a `0.0261` Sobel
  edge-support IoU for diagnosis only and remains blocked because edges are not
  a filled semantic silhouette. Four full-frame mask-difference artifacts make
  these results reviewable without reusing any source-tied semantic mask.
  The preliminary unmasked raster diagnostic passes only 1 of 15 states, while
  structural accuracy has 1 failed and 14 blocked states.
- Phase 2 now passes its own current-checkpoint safety gate: all 22 configured
  current-page Chromium and Mobile Chrome executions pass.
- Phases 3 and 4 now pass their own hygiene gates: the legacy
  runtime is deleted, the active graph is singular, selector residue is gone,
  direct dependencies are app-owned, and fresh source/production executable
  scans and current browser smoke are clean.
- Phase 5 passes its own architecture/determinism gate: current browser
  convergence covers forward, reverse, direct jump, resize, and restored
  reload on genuine desktop and mobile profiles; repeated named-state captures
  are stable; and a complete atomic capture manifest verifies all 30 artifacts
  by byte count and SHA-256.
- Phase 6 passes its own DOM/lifecycle gate with 13 passes, no failures or
  blocked checks, and 2 states not applicable across the entire four-row
  ladder. Phase 7 and every later visual-construction phase remain not
  accepted. Comparator schema 10 reports preliminary raster at 1 pass and 14
  failures, with structural accuracy at 0 passes, 1 failure, and 14 blocked
  states.

The ordered visual release therefore remains held at Phase 1. Passing a later
phase's own gate records what is proven at the current checkpoint; it does not
waive the Phase 1 evidence prerequisite or confer final visual acceptance.

## Outcome

Build the Pegasoft hero as a scroll-scrubbed journey through a persistent
miniature industrial world. Match the reference's screen-space composition,
visual hierarchy, camera behavior, route continuity, interaction grammar, and
responsive behavior while retaining Pegasoft branding and copy.

The implementation must have one active scene system. Git history is the
rollback mechanism; a dormant production renderer is not.

## Documents reviewed and their authority

| Document or code                                               | Role                                                                            | Authority                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [website-plan.md](./website-plan.md)                           | Pegasoft product, brand, conversion, accessibility, and performance constraints | Product context only                                                         |
| [pegasoft-codex-usage-memo.md](./pegasoft-codex-usage-memo.md) | Delivery and verification working policy                                        | Process context only                                                         |
| [vectr-hero-motion-map.md](./vectr-hero-motion-map.md)         | Working observation notebook                                                    | Must be rechecked against the live site and recording; never a visual source |
| Current Pegasoft implementation                                | Inventory of potentially reusable work and known failure modes                  | Never reference authority                                                    |
| Earlier hero plans, screenshots, and captures                  | Historical context                                                              | Superseded                                                                   |

This document is the implementation plan. It does not elevate another Markdown
document or a generated screenshot into design evidence.

## Source of truth and provenance

The only visual authorities are:

1. the current production hero at [vectrfl.com](https://www.vectrfl.com/);
2. the repository recording,
   [vectrfl_recording.mov](./vectrfl_recording.mov), for reproducible desktop
   states and transition order.

Recording identity:

- SHA-256:
  `de2d5e03a9bb8c1ef93278088f9f205b48710a3ce9568a648b96d619cfaeb321`;
- H.264, `3016x1522`, `1980` frames;
- nominal `60fps`, average approximately `59.97fps`, duration `32.927833s`;
- file size `190835536` bytes.

Evidence rules:

- When the live site and recording differ, record the difference. Use the live
  site for current behavior and responsive rules; keep the recording as the
  stable desktop regression anchor.
- The recording contains user-controlled scrolling. Timestamps identify
  observed states, not authored animation durations.
- Scroll progress is the journey clock. Elapsed time is allowed only for the
  loader/reveal, resolved-landing idle motion, and local stateful effects that
  the reference demonstrably continues while scroll is stationary.
- Any extracted frame ladder or Pegasoft screenshot is disposable,
  reproducible test output. It may aid comparison but must cite the live URL or
  recording timestamp/frame as its provenance.
- Every external scratch asset or path from an earlier session is obsolete and
  forbidden in plan data, runtime metadata, tests, and acceptance records.
- The opaque `vectr-ref2-01` through `vectr-ref2-10` aliases have no repository
  assets or traceable provenance. Do not translate them; remove them.
- Absolute world directions such as “south-west” are implementation
  inferences unless the current site source proves them. Acceptance uses
  measured screen-space bounds, route topology, and camera-direction cues.

The repository-owned current-live refresh generated at
`2026-07-30T12:27:02.718Z` passed all four isolated Chrome
`150.0.7871.188` profiles: recording desktop `1508x761`, desktop `1440x900`,
tablet `1024x768`, and mobile `390x844`. The tablet and mobile results are
browser emulations, not physical-device or performance evidence. Main-thread
WebGL context-loss events were monitored and none were observed;
worker/OffscreenCanvas context-loss state remains unknown.

## Reference findings from this review

These findings come from the current live site and direct inspection of the
repository recording. Exact contact frames and bounds still belong in the
evidence gate.

### Recording sequence

The recording begins with a brief already-resolved page before the reload
loader appears. Do not label frame zero as “loader begins.”

Verified comparison anchors:

| Recording time  | Observable state                                                   |
| --------------- | ------------------------------------------------------------------ |
| `0.0–0.8s`      | Pre-reload resolved page; capture setup, not a target loader state |
| `~0.9s`         | Reload/reset to pale field and tiny central blue squares           |
| `1.0–1.8s`      | Squares orbit/assemble; oversized elliptical contour lines sweep   |
| `1.9–3.1s`      | Blue arrow/brand loader resolves while contours continue           |
| `3.2–3.7s`      | Industrial world, red rails, and header compose into view          |
| `3.8–4.4s`      | Heading tilts/translates into place, followed by body copy         |
| `4.4–8.4s`      | Resolved idle landing with red route packets                       |
| `~8.5s`         | Journey scroll begins and landing copy exits                       |
| `8.8–9.0s`      | Step 01 becomes established                                        |
| `9.0–13.3s`     | Red route travel and later cyan/blue handoff cues                  |
| `13.4–13.6s`    | Step 02 becomes active                                             |
| `13.5–20.4s`    | Blue-route travel through broad industrial context                 |
| `~20.5s`        | Tile field preview begins while Step 02 remains active             |
| `~22.0s`        | Step 03 becomes active in a strongly top-down composition          |
| `22.5–29.3s`    | Repeated field pulses expand/reset around stable contact           |
| `29.4–29.6s`    | Step 04 becomes active                                             |
| `30.0–31.2s`    | Close frontal arrow lockup and horizontal cyan feed                |
| `~31.4s onward` | Journey yields to the following white page section                 |

The repository now stores exact selected frames for all 15 states and a
2026-07-30 live-to-recording target-progress calibration. Those progress
targets are evidence-backed capture candidates, not visual acceptance:
authoritative bounds for four landmark-primary states and two copy-transition
states remain missing. Screen-space edge-support distributions, centroids, and
negative-space proxies now cover all 15 source states. The recording still
cannot expose 3D camera transforms, and those unknowable transforms are no
longer treated as a source-evidence prerequisite. Implementation-side
composition measurements now exist for all 15 states. They pass 191 of 285
locked checks and fail 94. All 11 source-applicable implementation copy
envelopes and the journey-exit boundary are also measured: copy bounds pass 18
of 44 checks and the boundary passes all 4. The implementation route pass now
emits two observed red-route cores and ten explicit source-predicate quality
blocks. Its available route proxies pass 5/12 checks; full centerline Hausdorff
evidence remains missing. Three implementation landmarks are observed and pass
8/12 center/size checks. The two chroma-isolated landmarks now emit silhouette
IoU evidence and fail the `0.90` minimum at `0.3987` and `0.6460`; the arrival
arrow's `0.0261` Sobel overlap remains an edge-support proxy, not silhouette
acceptance. Three source-mask landmarks remain semantic-isolation blocks, and
`field-pulse-b` remains source-pixel quality-blocked.

### Current live implementation clues

- The settled hero copy is “The New Standard in Staffing,” followed by the
  process steps `01 Activation, simplified`, `02 Cleared to count`,
  `03 Proven field match`, and `04 Seamless arrival`.
- The live journey is scroll-scrubbed. Its source uses DOM handoffs near
  `0.191`, `0.697`, and `0.876`, with route/camera activity distributed across
  smaller internal ranges. These are measurement clues, not values to paste
  into Pegasoft without same-viewport comparison.
- A single raw scroll measurement does not imply identical DOM and scene
  thresholds. The live source maps them differently; Pegasoft may do the same
  through explicit, serializable curves owned by one controller.
- The current live GLB world is not rotated at the stage-3 transition. The
  apparent reorientation is produced by camera position/quaternion changes.
  Pegasoft must therefore start with a fixed world and one camera-owned
  composition transition. A world-root rotation is allowed only if comparison
  proves it necessary, and camera plus world must never both implement the same
  turn.
- The live camera uses a short smoothing window, approximately `0.15s` on
  desktop and `0.10s` on mobile. “No catch-up” means no lingering or
  state-divergent lag; it does not mean removing reference-like smoothing.
- Fine-pointer desktop also includes subtle pointer-driven camera displacement.
  Treat it as a measured finishing behavior after the core camera track passes,
  and omit it from mobile/coarse-pointer profiles.
- The dotted/mouse treatment is a fine-pointer desktop behavior. The current
  live source does not create its pointer-trail texture or pointer listener on
  mobile/tablet. Touch activation is not a reference requirement.
- Mobile uses a separate lighter scene asset, a taller journey, compact
  centered copy, and a visible bottom scroll cue at `390x844`. Pegasoft needs a
  measured mobile composition/profile; it must not assume that desktop camera
  values or desktop pointer behavior merely scale down.
- The heading reveal includes a visible 3D tilt/translation. The earlier ban on
  3D copy rotation was unsupported. Its scroll exit also uses pronounced
  perspective rotation/translation rather than a simple fade.
- Landing route packets are staggered across four paths. The live source draws
  each for about `1s`, retracts it over `0.8s`, and respawns it after a random
  `1.4–3s` idle delay while target progress remains zero.
- Field pulse and the arrival mark use local elapsed time after their progress
  gates. The final live camera continues a measured retreat beyond the arrow
  reveal into journey exit.
- The current public reference has no dedicated reduced-motion branch.
  Pegasoft's reduced-motion compositions are therefore a product/accessibility
  requirement, not behavior to copy from Vectr.

### Observable visual invariants

- One pale industrial world and continuous route explain the full journey.
- Landmarks have materially more travel space than the current local scene.
- Red architectural rails lead into a blue illuminated route at the first
  destination.
- The camera reads as route/beam-relative during travel and does not make
  abrupt right-angle or half-turn stage flips.
- A large irregular rounded-tile field, elevated blue center, and repeated
  luminous band/ring states dominate stage 03.
- The blue route continues from the field into a close arrow destination.
- Ground/context fills accepted frames; a platform edge or dark void is not
  exposed.

## Current implementation audit

### Accepted hygiene and isolation

- The audit caught the later accidental deletion of
  `docs/vectrfl_recording.mov` and restored it from commit `4db3f5b`'s local
  Git LFS object. Its current `190835536` bytes reproduce the recorded
  SHA-256, and the structural-bounds reproducibility check passes.
- `pegasoft-field-scene.tsx`, its renderer switch, and the adjacent unused
  motion-system particle hero are absent from the current tree and remain
  recoverable from Git history.
- The source and fresh production executable payload contain no legacy
  renderer, `vectr-ref2-*`, Anime.js hero path, development query key,
  development state/seed contract, recording-evidence payload, or external
  scratch marker. Production source maps also contain none of those contracts,
  but one private server source map retains the two dynamic-import module path
  strings `hero-development-control` and `hero-development-diagnostics`.
  `__heroState` and the actual control contract are absent.
- Former legacy hero CSS and the 19 unowned old-page selector families are
  gone. Scoped hero shell/scene modules have source consumers, and every
  remaining `global.css` class family has an exact app consumer.
- The Pegasoft app directly declares `clsx`, React Three Fiber, Drei, and
  Three.js. Motion-system lint, typecheck, and its two tests pass after removal
  of the unowned particle hero.
- The workspace declares Node `^20.19.0 || ^22.13.0 || >=24.0.0`, matching
  jsdom 29's runtime floor and the Node 24 CI environment; this prevents the
  merged dependency resolution from being misdiagnosed under Node 20.15.

The detailed evidence is in
[`cleanup-inventory.json`](./hero-reference/cleanup-inventory.json).

### Implemented candidate architecture

- `PegasoftHome` owns one animation-frame-scheduled physical page-geometry
  stream; a pure controller owns raw, DOM, scene, lifecycle, profile, state,
  and local-clock outputs.
- DOM copy and `HeroScene` consume the same snapshot.
- The 45-line fixed-world assembly delegates bounded geometry to stage modules.
  One canonical route feeds route rendering, camera/contact sampling, beam, and
  tests.
- The camera render adapter owns actual damped progress. The controller does
  not fabricate a settled-camera snapshot.
- The production runtime imports a minimal 15-state projection; full recording
  paths, hashes, measurements, and audit prose remain in evidence/test code.
- Reduced motion uses demand rendering, immediate poses, discrete copy
  handoffs, no pointer trail, and no continuing route/pulse clocks.
- The static alternative has deterministic loader, landing, journey, field,
  arrival, and exit compositions rather than one generic fallback.
- Five Vitest files pass 38 tests, including typed topology-manifest and
  measured-bound contract coverage.
  Current-page smoke passes 22 configured browser executions and
  alternative/focus coverage passes 8; the two opt-in performance probes are
  intentionally excluded from that functional result.
- A browser convergence suite now covers forward, reverse, direct jump,
  resize, and restored-scroll reload on genuine desktop and mobile profiles,
  and the same named state produces a stable repeated capture. The targeted
  convergence run passed `2/2`; the final full browser suite passed `30`, with
  the two opt-in Phase 19 performance probes skipped.
- Page geometry now observes flow/feature resizing and visual-viewport changes.
  This closes the mobile post-hydration and restored-reload measurement gap
  without introducing a second progress source.
- The process copy no longer applies a duplicate `48px` wrapper inset. One
  `48px` steps-container inset preserves child-row placement while matching
  the authoritative whole-ladder container bounds.
- The current recording-profile run captures all 15 states only after app and
  E2E typechecks pass. It publishes an atomic manifest whose byte counts and
  SHA-256 values are required by the comparator for all 15 images and 15
  measurement records. Run
  `3ea50840-e8ad-439b-9ee9-e7e8bca3e24b` completed at
  `2026-07-30T12:45:18.739Z`; every capture required a visible real WebGL
  canvas, full motion, the `recording-desktop` profile, seed `43117`, render
  readiness, and no observed context loss.

Phase 5 passes its own current-checkpoint gate. Its architecture remains
provisional in the ordered program because Phase 1 source evidence is
incomplete; passing the harness gate does not freeze visual constants.

### Accuracy blockers

- Locked landing and journey DOM profiles cover 13 applicable states.
  Deterministic recording analysis measures seven landmarks, 12 visible route
  cores, 11 copy-ink envelopes, 15 screen-space composition proxies, and one
  section boundary. Every applicable route state is measured; three states
  correctly mark route bounds not
  applicable. Eleven copy states are measured and two remain explicitly
  blocked at faded/clipped transition frames. Four states use a
  source-visible route or boundary as their primary structure and correctly
  mark landmark bounds not applicable; four landmark-primary states remain
  explicitly blocked. The `activation-route`, `activation-contact`, and
  `field-contact` semantic-mask overlays completed their personal-review
  checkpoint; that review does not confer visual acceptance.
- The 15-state comparator is operational and intentionally returns a non-zero
  result. Schema 10 keeps three independent verdicts: preliminary unmasked
  raster has 1 pass and 14 failures; structural accuracy has 0 passes, 1
  failure, and 14 blocked states; and whole four-row ladder DOM has 13 passes,
  no failures or blocked checks, and 2 states not applicable. Preliminary
  raster is a diagnostic, not structural or final visual acceptance. Within
  the blocked structural verdict, composition has 191 passing and 94 failing
  checks: global negative-space occupancy passes 14/15, normalized centroid
  axes pass 5/30, and fixed-grid occupancy passes 172/240. Copy-ink bounds pass
  18/44 checks, landmark evidence passes 8/15 checks, the two
  observable red-route cores pass 5/12 proxy checks, and the journey-exit
  boundary passes 4/4. Three implementation landmarks remain
  semantic-isolation blocked, one remains source-pixel quality-blocked, and
  the two emitted silhouette IoUs fail at `0.3987` and `0.6460`; the emitted
  arrival `0.0261` edge-support IoU remains diagnostic only. Ten routes remain
  source-predicate quality-blocked; centerline Hausdorff evidence is not yet
  emitted for the two observed routes.
- No identity pixels are hidden: the pixel-precise identity mask is blocked,
  zero pixels are masked, and all `68,855,280` report pixels are evaluated.
- Recording structural evidence is serialized in
  [`recording-structural-bounds.json`](./hero-reference/recording-structural-bounds.json)
  and is byte-reproducible with
  `node tools/hero-reference/measure-recording-bounds.mjs --check`.
- The procedural world, projected route, camera anchors, loader/packet/pulse
  timing, pointer-trail appearance, arrival lockup, materials, and lighting are
  implementation candidates, not frozen reference matches.
- The current public scene assets are not copied or hotlinked into Pegasoft.
  Exact source-asset reuse requires explicit rights; otherwise matching must be
  achieved with independently owned geometry.
- The performance harness is implemented, but the available software-rendered
  development diagnostic is not a locked-hardware production acceptance run
  and exceeds multiple budgets. The Phase 19 acceptance performance run
  remains unrun.

No code listed in this candidate section inherits visual acceptance.

## Mandatory Gate A — evidence and preservation

Status: not accepted.

Current blocker: all 15 states resolve to exact recording frames and current
live target-progress candidates. A deterministic, hash-verifying measurement
pipeline resolves seven landmark boxes, 12 visible route cores, 11 copy-ink
envelopes, 15 fixed-grid screen-space composition proxies, and the journey-exit
section boundary. It marks three route fields not applicable and no applicable
route field blocked. It marks two copy fields
not applicable, measures 11, and blocks two faded/clipped transition states.
It marks four landmark fields not applicable where the source-visible primary
structure is instead a route or boundary, and blocks
four landmark-primary states where semantic isolation is not defensible. Three
complete-subject boxes are derived mechanically from source-tied, hash-locked
semantic SVG masks whose personal-review checkpoint is complete.
Locked live DOM contracts cover the two landing and 11 journey states, and the
current implementation passes all 13 applicable DOM checks. Those checks cover
the entire four-row process ladder, not only the active row. Generated
implementation captures may not fill the remaining source-evidence gaps.
Structural accuracy remains blocked for all 15 states, while the preliminary
unmasked raster diagnostic remains red in 14 of 15 states.

Complete this evidence before accepting visual tuning:

1. Preserve the full current working diff in a recoverable Git commit/branch or
   equivalent repository-backed snapshot. Do not use an external scratch
   directory as the archive.
2. Record the live-reference audit date, URL, browser, DPR, and viewport for
   desktop, tablet, and mobile observations.
3. Seek exact recording frames around each anchor below and record the
   timestamp plus frame number.
4. Measure in screen space:
   - camera/travel direction cues;
   - active landmark bounding box;
   - route entry/exit point and apparent thickness;
   - negative-space distribution;
   - field outline, tile count/profile, and contact center;
   - pointer trail radius/falloff on desktop;
   - arrival-arrow and surrounding-mark bounds;
   - copy block and header bounds.
5. Capture current Pegasoft states at the same aspect ratio as disposable test
   output so the existing work is documented before pruning.
6. Record every live-versus-recording difference instead of silently choosing
   a convenient version.

Required named states:

- `loader-mark`
- `world-reveal`
- `landing`
- `landing-idle`
- `activation-route`
- `activation-contact`
- `clearance-travel`
- `clearance-field-preview`
- `field-approach`
- `field-contact`
- `field-pulse-a`
- `field-pulse-b`
- `arrival-travel`
- `arrival-lockup`
- `journey-exit`

Each accepted state record must contain:

```text
key
source URL or recording SHA
source timestamp and frame
source viewport and DPR
journey progress target
active copy state
camera position / quaternion or equivalent pose
look/focus target
active route segment and interaction mode
landmark and copy screen bounds
expected visible context
confidence and unresolved differences
```

Gate A exit:

- every named state has traceable source evidence and measurable observables;
- recording anchors no longer conflict across the plan, motion map, and code;
- no acceptance record cites a generated screenshot or external scratch asset
  as its authority.

## Mandatory Gate B — hygiene and hard isolation

Status: accepted on 2026-07-30.

Evidence:

- the legacy renderer, switch, duplicate systems, opaque aliases, particle
  hero, and legacy DOM/CSS are absent;
- hero styles have scoped owners and the shared CSS consumer audit has no
  residue;
- direct app dependencies are declared;
- app, E2E definition, motion-system, production build, and production
  executable payload checks pass; the recorded source-map module-path caveat
  does not hide a legacy renderer or direct-control contract.

See [`cleanup-inventory.json`](./hero-reference/cleanup-inventory.json). The
steps below remain the durable checklist that this accepted gate must continue
to satisfy.

1. Keep the public `HeroScene` boundary functional with the current candidate
   or a minimal static/proxy fallback.
2. Remove the legacy import and `HERO_RENDERER` switch.
3. Delete `pegasoft-field-scene.tsx` after any approved neutral primitives are
   copied into source-owned modules. New code must never import from the legacy
   file.
4. Remove the legacy stage DOM, query/mutation loops, and legacy-only CSS.
5. Remove unused old Pegasus hero CSS only after verifying selector consumers
   across the app.
6. Remove `vectr-ref2-*` metadata and any other reference identifier that
   cannot resolve to the live URL or recording timestamp/frame.
7. Remove Anime.js from the hero dependency path if no remaining feature uses
   it.
8. Move hero-specific Canvas/fallback/copy styling into scoped modules rather
   than growing the page stylesheet.
9. Declare all direct runtime dependencies in the Pegasoft app package.
10. Audit the unused motion-system particle hero and remove it only if the
    dependency graph confirms no consumer.
11. Reset `reference-states.ts` to the Gate A schema.
12. Split the candidate `hero-world.tsx` before adding detail so stage
    geometry, interactions, and pulse state do not form a replacement
    monolith.

Gate B exit:

- the app builds without `pegasoft-field-scene.tsx`, `HERO_RENDERER`,
  `vectr-ref2-*`, the negative-progress branch, or legacy hero DOM;
- fresh production output contains no legacy cluster/stage/reference strings;
- only one route, camera, beam, world, progress, and fallback system exists in
  the active import graph;
- the page can show a useful static/proxy fallback with the Canvas disabled;
- fresh Nx lint and build pass after cleanup;
- dependency ownership is explicit at the app boundary.

## Target architecture after Gate B

```text
PegasoftHome
  HeroJourneyController
    normalized progress
    lifecycle: loading | landing | journey | exit
    motion profile: full | reduced | static
    named reference-state snapshot
  DOM hero/process copy <- the same snapshot
  HeroScene <- the same snapshot/ref
    HeroCanvas | HeroFallback
      HeroCameraRig
      HeroWorld
        Activation
        Clearance
        FieldMatch
        Arrival
      HeroRoute
      HeroBeam
      DesktopPointerTrail
```

Required ownership rules:

- `PegasoftHome` measures document scroll once.
- The journey controller creates the snapshot once. DOM copy and WebGL consume
  the same snapshot; the scene does not calculate step thresholds again.
- The render loop may sample progress through a ref, but it must not observe
  document scroll.
- The camera rig is the only owner of camera pose and reference-like
  smoothing.
- One controller owns any distinct DOM-state and scene-state mapping curves.
  They share raw progress and lifecycle, but need not share identical
  thresholds.
- The world root remains fixed for the initial implementation. If evidence
  later requires a world transform, one dedicated transform owner replaces,
  rather than compounds, the camera transition.
- Route geometry is canonical data shared by route rendering, beam tip,
  camera-relative frames, contact events, and tests.
- Loader time, landing idle cadence, and field pulse have explicit local
  clocks and deterministic reset rules.
- Desktop pointer trail state is independent from camera motion and is absent
  on coarse-pointer/mobile profiles unless the live source changes.
- Stage modules own geometry only. They do not own document scroll, global
  camera state, or DOM queries.
- Reference records are serializable and testable; Three.js objects do not
  leak into the evidence schema.

Suggested internal boundaries:

```text
shared/hero-scene/
  hero-scene.tsx
  hero-contract.ts
  hero-controller.ts
  hero-sequence.ts
  hero-route.ts
  hero-camera.tsx
  hero-beam.tsx
  hero-pointer-trail.tsx
  hero-materials.ts
  hero-world.tsx
  reference-states.ts
  stages/
    activation.tsx
    clearance.tsx
    field-match.tsx
    arrival.tsx
```

The filenames may change; the ownership boundaries may not collapse back into
one file.

## Visual and motion baseline

### Persistent world

- Build one continuous pale-blue industrial world.
- Reproduce relative screen-space placement and route topology from measured
  states. Do not begin from unverified “south-west/south/west” coordinates.
- Keep distant buildings, turbines, trucks, workers, stacks, and
  infrastructure when naturally inside the camera frustum.
- Establish hierarchy with framing, atmospheric falloff, route activity,
  lighting, and local emphasis. Do not use monument opacity windows as the
  primary stage mechanism unless the source clearly does.
- Make accepted frames read as unbounded; expose no platform edge or dark void.

### Camera

- Use one route/beam-relative camera rig with measured poses at reference
  states.
- Keep the scene world fixed while reproducing the live camera-composition
  transition around field approach.
- Do not add 90°/180° flips, procedural bobbing, or speed-dependent scenic
  look-ahead during the structural baseline. Add the reference's subtle
  fine-pointer camera displacement only after the core track passes.
- Match the reference's restrained progress smoothing rather than hard-setting
  an unrelated series of camera stops or adding open-ended catch-up.
- Forward, reverse, scrollbar jump, resize, and restored scroll position must
  converge to the same state without a second clock.
- Start with the reference's high, product-visualization perspective. Change
  projection type only after same-viewport comparison.

### Loader and landing

- Keep loader/reveal time separate from journey progress.
- Do not use the recording's pre-reload opening frames as loader targets.
- Reveal the world before or with the 3D tilt/translation of the centered hero
  copy; avoid a blank pose between loader and landing.
- Preserve a quiet red-route idle cadence after landing resolves and stop it
  when journey scroll begins.
- Keep the header stable and above the Canvas.

### Step 01 — activation

- Thin red architectural routes originate inside the city cluster, converge,
  and leave it.
- Keep the route crisp and red; it must not read as a recolored blue glow.
- Move from the landing composition into step-01 route travel while keeping
  the first handoff destination spatially legible.

### Step 02 — clearance

- At the first destination, hand off from the red route to the blue illuminated
  route.
- Follow the blue route through materially open transit space.
- On fine-pointer desktop, reproduce the local mouse-trail/dotted response with
  correct camera projection or raycasting. Do not use a fixed NDC-to-world
  approximation.
- On mobile/tablet/coarse-pointer profiles, omit the mouse trail. Supply a
  deliberate static/ambient route treatment instead of inventing touch
  behavior.
- Allow the field to preview at the frame edge before step 03 if the measured
  state does.

### Step 03 — field match

- Reconstruct the field outline and tile count from measured frames. Neither
  the old `11x11` grid nor the current irregular row list is accepted.
- Use separated rounded white tiles around an elevated blue center and figure.
- Reproduce the apparent composition turn through the camera rig; do not rotate
  both camera and world.
- Contact starts a deterministic repeated band/ring treatment whose cadence,
  radius, and reset behavior are measured from the source.
- If scrolling stops after contact, the reference-like local pulse may
  continue. Reverse before contact resets it; re-entry restarts predictably.

### Step 04 — arrival

- Continue the blue route and dotted/ambient wake out of the field.
- Preserve camera continuity into the final destination.
- Resolve the blue arrow and surrounding square/diamond marks at the measured
  close scale and screen bounds.
- Do not retreat before the lockup is readable. After lockup, reproduce the
  measured camera retreat into journey exit without exposing a world edge or
  introducing another large reorientation.

### DOM copy, responsive, and reduced motion

- Drive process number, heading, paragraph, compact index, and scene from the
  same journey snapshot.
- Match the reference desktop copy placement and measured transition ranges
  while retaining Pegasoft wording.
- Define separate desktop, tablet, and mobile camera/layout profiles from live
  observations. Desktop values must not be scaled blindly.
- Treat mobile journey height, copy position, asset/geometry detail, DPR, and
  scroll cue as explicit decisions.
- Reduced motion uses useful static named compositions and discrete handoffs.
  It must not regress to a blank Canvas or a generic state-independent
  fallback.
- Maintain header, focus, reading order, contrast, and keyboard behavior
  independently from Canvas motion.

## Accuracy contract

“Perfect accuracy” means that no visible or behavioral deviation from the
measured reference remains unexplained. Pegasoft wording and identity may
differ, but their containers, hierarchy, timing, and screen occupancy must
match. Accessibility and reduced-motion changes are allowed only when they are
documented as intentional product requirements.

The following are maximum tolerances, not goals. A visible mismatch still
fails even when a metric happens to pass.

| Measurement                            | Maximum accepted error                               |
| -------------------------------------- | ---------------------------------------------------- |
| DOM copy/header/CTA bounds             | `2 CSS px` or `0.25%` of the short viewport edge     |
| Primary landmark center                | `0.75%` of viewport width/height                     |
| Primary landmark width/height          | `2%`; silhouette IoU at least `0.90`                 |
| Screen-composition edge centroid       | `0.75%` of viewport width/height                     |
| Secondary context silhouette           | IoU at least `0.85`                                  |
| Route centerline                       | Hausdorff distance at most `0.75%` of the short edge |
| Route entry/contact/exit points        | `0.5%` of viewport width/height                      |
| Route thickness                        | `1 CSS px` or `10%`, whichever is larger             |
| Camera-direction or major scene axes   | `1°`                                                 |
| Negative-space occupancy               | `3%`                                                 |
| Flat solid-color samples               | Delta E 2000 at most `3`                             |
| Fog/glow samples after structural lock | Delta E 2000 at most `5`                             |
| Copy/scene progress handoff            | `0.005` normalized progress after live measurement   |
| Time-authored loader event             | `50ms` at the locked comparison profile              |
| Settled desktop camera                 | Under `1%` screen-space error within `450ms`         |
| Settled mobile camera                  | Under `1%` screen-space error within `300ms`         |

Always compare at the exact locked viewport, DPR, font state, journey progress,
local-effect time, and deterministic seed. Mask only the glyph/logo pixels that
must differ because of Pegasoft identity; never mask layout, geometry, route,
lighting, or motion errors.

### Mandatory per-state calibration loop

Every visual phase follows this loop:

1. Lock one authoritative source state, viewport, DPR, timestamp/frame, and
   local-effect phase.
2. Enter the corresponding Pegasoft state directly, without scroll momentum.
3. Render flat/grayscale proxy materials first.
4. Align projection, camera, primary landmark, copy bounds, route contacts, and
   negative space in that order.
5. Capture the implementation and produce an overlay, blink comparison,
   measurement report, and difference heatmap.
6. Correct structural errors before color, fog, bloom, or micro-detail.
7. Verify the state by forward entry, reverse entry, direct jump, resize, and
   restored reload position.
8. Record the passing measurements and freeze the state.

A later shared change may not move a frozen state outside tolerance. If it
does, explicitly reopen that state and every downstream phase that depends on
it. Full chronological playback is evaluated only after the individual state
locks pass.

## Ordered execution phases

All phases start `not accepted`. A phase may begin only after the previous
phase's stop/go gate passes. Phases 0–5 are hard blockers for all visual
tuning; decorative work cannot begin before Phase 16.

| Phase | Workstream              | What becomes locked                           |
| ----- | ----------------------- | --------------------------------------------- |
| 0     | Preserve dirty state    | Recoverable source/recording baseline         |
| 1     | Authoritative evidence  | State manifest, profiles, and tolerances      |
| 2     | Smoke safety net        | Passing current-page tests                    |
| 3     | Legacy severance        | One active hero import graph                  |
| 4     | CSS/dependency hygiene  | Clean selectors and package ownership         |
| 5     | Architecture/harness    | Deterministic controller, tests, and captures |
| 6     | DOM/lifecycle           | Copy layout and mapping curves                |
| 7     | Proxy topology          | World spacing and canonical route             |
| 8     | Static cameras          | All high-information anchor poses             |
| 9     | Camera motion           | Interpolation and damping                     |
| 10    | Loader/landing          | Time-based reveal and idle cadence            |
| 11    | Activation              | Step 01 silhouette and red route              |
| 12    | Clearance               | Step 02, blue route, and desktop trail        |
| 13    | Field match             | Step 03 geometry, approach, and pulse         |
| 14    | Arrival                 | Step 04 lockup and journey exit               |
| 15    | Full desktop motion     | Chronological/reverse/jump behavior           |
| 16    | Desktop art             | Materials, lighting, typography, and nuance   |
| 17    | Responsive profiles     | Authored tablet/mobile states                 |
| 18    | Accessible alternatives | Reduced motion and fallback                   |
| 19    | Production cutover      | Performance, bundle hygiene, final evidence   |

### Implementation checkpoint — 2026-08-20

The status below reports each phase's own evidence without pretending that
provisional downstream implementation waived the ordered release gate.

| Phase | Gate status                                             | Evidence or blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | **Accepted**                                            | Recoverable source/document commits, Git LFS recording, independent SHA, inventory, and recovery commands are committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1     | **Not accepted**                                        | Exact frames, profiles, target calibration, classifications, schemas, seven source landmark boxes, 12 source route cores, 11 source and implementation copy-ink envelopes, 15 source and implementation screen-composition proxies, source and implementation journey-exit boundaries, and 13-state DOM authority exist. Composition passes 191/285 checks, copy bounds pass 18/44, landmark evidence passes 8/15 checks, two observed red-route cores pass 5/12 route-proxy checks, and the boundary passes 4/4. Loader and world-reveal silhouette IoUs are measured but fail at 0.3987 and 0.6460; arrival's 0.0261 overlap is edge support only. Four source landmark-primary states, two source faded/clipped copy states, three semantic-isolation landmark blocks, one source-pixel landmark block, the remaining arrival silhouette, ten source-predicate-blocked implementation routes, route centerlines, and additional observables remain blocked. The source-tied masks completed their personal-review checkpoint without conferring visual acceptance. |
| 2     | **Own gate passed; ordered acceptance held at Phase 1** | All 22 configured current-page Chromium and Mobile Chrome executions pass against the current renderer/layout checkpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3     | **Own gate passed; ordered acceptance held at Phase 1** | Legacy source is deleted; one Canvas/fallback boundary ships; fresh source and production executable scans, lint/unit/build, and current browser smoke pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4     | **Own gate passed; ordered acceptance held at Phase 1** | Selector residue is zero, hero CSS is scoped, app dependencies are explicit, motion-system validation passes, and current shared-route browser smoke passes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5     | **Own gate passed; ordered acceptance held at Phase 1** | The architecture, 38 unit tests, direct-state control, repeat-capture stability, genuine desktop/mobile forward/reverse/jump/resize/restored convergence, and atomic 15-state size/SHA-256 artifact manifest pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6     | **Own gate passed; ordered acceptance held at Phase 1** | The current manifest-verified capture passes all 13 applicable landing/journey DOM contracts across the entire four-row ladder; two states are correctly not applicable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7–17  | **Not accepted**                                        | Comparator schema 10 reports preliminary raster at `1 pass / 14 fail`, composition at `191 pass / 94 fail`, copy bounds at `18 pass / 26 fail`, landmark evidence at `8 pass / 7 fail`, route proxies at `5 pass / 7 fail`, boundary bounds at `4 pass / 0 fail`, and structural accuracy at `0 pass / 1 fail / 14 blocked`; it cannot accept route, geometry, motion, art, or responsive scene states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 18    | **Not accepted**                                        | All eight current reduced-motion, fallback, mobile-navigation, and deterministic static-composition executions pass, but the phase depends on accepted full-motion and responsive compositions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 19    | **Not accepted**                                        | Production executable assets are clean. Source maps retain two development dynamic-import module path strings but no control contract. The two opt-in performance probes and locked-hardware budgets remain unrun, and upstream visual gates have not passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The next legal acceptance work is to continue Phase 1 structural measurement
where the automated pipeline is blocked. Phases 2–6 have current own-gate
evidence, but no visual-construction phase can turn green until Phase 1 closes.
Existing Phase 7–19 code is testable scaffolding or a comparison candidate,
not a reason to skip those gates.

### Phase 0 — preserve the current dirty state

Status: accepted on 2026-07-28 and reverified on 2026-07-30.

Evidence: commits `e7897fe`, `4db3f5b`, and `cac3844`; recording Git LFS object
and SHA; [`phase-0-baseline.json`](./hero-reference/phase-0-baseline.json).
The current audit found that commit `8000ccc` had later deleted the working
recording despite the plan's acceptance claim, restored it from the verified
LFS object, and reran the hash-verifying structural measurement successfully.

Steps:

1. Inventory every modified and untracked hero/document file.
2. Preserve code and documents in a recoverable Git branch/commit or equivalent
   repository-backed snapshot.
3. Preserve the authoritative recording through Git LFS or another
   repository-backed mechanism appropriate for its `190835536`-byte size, and
   record its SHA-256 independently.
4. Preserve the Phase 0 verification baseline—app lint/build pass and E2E
   `6 passed / 4 failed`—as historical evidence, distinct from the current
   validation snapshot.

Artifact:

- snapshot identifier, file inventory, recording location/hash, and current
  verification report.

Stop/go gate:

- a clean checkout or equivalent recovery procedure can reproduce every
  current source/document change and the exact recording;
- no deletion begins until this gate passes.

### Phase 1 — lock authoritative evidence and tolerances

Status: not accepted.

Implemented but insufficient: all 15 exact frames, comparison profiles,
classification vocabulary, accuracy schema, live-source evidence, locked
landing/journey DOM profiles, 2026-07-30 target-progress calibration, and a
hash-verifying structural measurement pipeline exist. That pipeline measures
seven landmarks, 12 visible route cores, 11 copy-ink envelopes, 15 fixed-grid
screen-space composition proxies, and one section boundary. It measures every
applicable route state, correctly classifies three route fields, two copy
fields, and four route/transition-primary landmark fields not applicable, and
blocks four genuinely landmark-primary states plus two faded/clipped
copy-transition states. The source-tied semantic-mask measurements completed
their personal-review checkpoint. The recording's 3D camera transform remains
explicitly unknown; observed composition proxies replace it as the legal
screen-space comparison authority. The same algorithm now measures all 15
implementation captures and exposes 94 composition failures rather than a
missing-evidence blocker. The capture also measures all 11 applicable copy-ink
envelopes and the journey-exit boundary; their mismatches remain red rather
than being relabeled as accepted. All 12 source route configurations now run
against implementation screenshots: two red routes are observed, ten select no
source-qualifying pixels, and the incomplete PCA proxy does not substitute for
the required centerline Hausdorff evidence. The four transferable landmark
methods also run against implementation screenshots: three are observed, one
is source-pixel quality-blocked, and the three source semantic masks remain
explicitly non-transferable. Their shared selected-pixel masks now compare
directly: the loader and world-reveal silhouette IoUs fail at `0.3987` and
`0.6460`, while the arrival `0.0261` Sobel overlap is retained only as an
edge-support diagnostic. Field, pointer, route-envelope, copy-transition, the
remaining arrival silhouette, and semantic-isolation observables still block
the gate.

Steps:

1. Complete Mandatory Gate A.
2. Resolve the recording's effective CSS viewport/DPR pair before accepting
   typography measurements; use normalized coordinates until resolved.
3. Populate all named state records with exact recording frames, live
   observations, screen bounds, route/camera/copy data, and confidence.
4. Label every claim `observed`, `source-confirmed`, `inferred`, or `unknown`.
5. Record the three independent comparison profiles:
   - recording desktop at the exact `3016x1522` raster/aspect;
   - live desktop at `1440x900` and `1920x1080`, DPR `1`;
   - live mobile at `390x844`.
6. Record browser version, device/input class, CPU/GPU, display refresh rate,
   and power mode for representative performance runs.
7. Define the accuracy report schema from the table above.

Artifact:

- serializable reference-state manifest, comparison-profile manifest, exact
  extraction instructions, deterministic structural-bounds report, locked
  landing/journey DOM profiles, and live-versus-recording decision log.

Stop/go gate:

- every target state resolves to the live URL or recording SHA plus frame;
- no runtime constant is accepted merely because it exists in current code;
- no conflicting timestamp, opaque reference alias, or external scratch asset
  remains in acceptance metadata.

Nx verification:

```sh
pnpm nx lint @site/pegasoft
pnpm nx build @site/pegasoft
pnpm nx run @site/pegasoft-e2e:typecheck
```

### Phase 2 — repair the smoke-test safety net

Status: own gate passed on the 2026-07-30 current checkpoint; ordered release
held at Phase 1.

Evidence: all 22 configured current-page Chromium and Mobile Chrome executions
pass against the latest renderer/layout candidate. The checks require a named,
render-ready hero surface without forcing a landing-only milestone.

Steps:

1. Replace obsolete E2E expectations for the old heading,
   `.pegasus-engine`, and `.hero-actions`.
2. Assert the current Pegasoft heading, primary CTA, header, active
   Canvas/fallback surface, and initial reference-state marker.
3. Make sure desktop and Mobile Chrome tests reach accessibility analysis.
4. Add a minimal production-page console/hydration/WebGL smoke assertion.
5. Do not add visual acceptance assertions yet.

Artifact:

- current-page smoke suite that protects destructive cleanup.

Stop/go gate:

- the existing desktop and Mobile Chrome suite passes against the current page;
- assertions prove that the active hero or useful fallback mounted.

Nx verification:

```sh
pnpm nx lint @site/pegasoft-e2e
pnpm nx run @site/pegasoft-e2e:typecheck
pnpm nx run @site/pegasoft-e2e:e2e
```

### Phase 3 — sever and remove the legacy renderer

Status: own gate passed on the 2026-07-30 current checkpoint; ordered release
held at Phase 1.

Evidence: the legacy file and renderer switch are absent; one Canvas/fallback
boundary remains; source and fresh production executable scans are clean; app
lint, 38 unit tests, production build, and current Chromium/Mobile Chrome
browser smoke pass.

Steps:

1. Keep a functional candidate/proxy `HeroScene` and useful static fallback.
2. Remove the `PegasoftFieldScene` import, `HERO_RENDERER`, and compatibility
   branch from the new entry point.
3. Delete `pegasoft-field-scene.tsx`; Git history is the rollback.
4. Remove its negative-progress branch, duplicate route/camera/beam/world,
   scroll/pointer loops, Anime.js DOM choreography, and hidden stage DOM with
   the file.
5. Give `ready`/`introReady` a new explicit lifecycle contract or remove the
   ignored props.
6. Search both source and production output for legacy strings.

Artifact:

- one functional new hero boundary that compiles without any legacy scene
  source.

Stop/go gate:

- the app builds with the legacy file absent;
- source and production output contain no old renderer, `vectr-ref2-*`,
  negative-progress, `.pegasoft-cluster*`, or `.pegasoft-stage*` identifiers;
- only one active Canvas/fallback boundary ships.

Nx verification:

```sh
pnpm nx lint @site/pegasoft
pnpm nx build @site/pegasoft
pnpm nx run @site/pegasoft-e2e:e2e
```

### Phase 4 — remove polluted CSS and repair dependency ownership

Status: own gate passed on the 2026-07-30 current checkpoint; ordered release
held at Phase 1.

Evidence: the former 19-family residue is removed; remaining shared and scoped
class families have consumers; direct app dependencies are explicit; app,
and motion-system lint/typecheck/test pass. Current shared-route Chromium and
Mobile Chrome smoke also passes. See
[`cleanup-inventory.json`](./hero-reference/cleanup-inventory.json).

Steps:

1. Remove legacy-only `.pegasoft-stage`, flow-path, flow-node, and cluster CSS.
2. Audit and prune unused `.pegasus-engine*`/old homepage CSS while preserving
   shared `.eyebrow` and `.hero-actions` consumers.
3. Move Canvas, fallback, loader, and hero-specific copy styles into scoped
   hero modules.
4. Declare `clsx`, React Three Fiber, Drei, and Three.js directly in the
   Pegasoft app package.
5. Remove Anime.js from the Pegasoft dependency path if no active Pegasoft
   feature uses it.
6. Audit the unused motion-system particle hero; remove its file/export only
   after proving no consumer, and preserve motion-system dependency ownership.

Artifact:

- selector-consumer inventory, explicit package manifests, updated lockfile,
  and clean dependency graph.

Stop/go gate:

- no dead legacy selector remains;
- homepage and shared pages still render correctly;
- hero styles no longer grow the monolithic page stylesheet;
- every direct runtime dependency has one explicit owner.

Nx verification:

```sh
pnpm nx lint @site/pegasoft
pnpm nx build @site/pegasoft
pnpm nx lint @site/motion-system
pnpm nx run @site/motion-system:typecheck
pnpm nx test @site/motion-system
pnpm nx run @site/pegasoft-e2e:e2e
```

Run the motion-system commands only when that project changes.

### Phase 5 — establish clean architecture and deterministic test control

Status: own gate passed on the 2026-07-30 current checkpoint; ordered
acceptance held at Phase 1.

Evidence: ownership boundaries, runtime/evidence separation, 35 passing unit
tests, 15-state direct capture control, state-specific fallback, and the
intentional failing visual comparator are present. Current Chromium and Mobile
Chrome runs pass forward, reverse, direct jump, resize, restored-scroll reload,
and repeated named-state stability on their genuine desktop/mobile profiles.
The targeted convergence run passed `2/2`; the final full suite passed `30`,
with the two opt-in Phase 19 performance probes skipped. ResizeObserver-backed
page measurement keeps mobile hydration and reload geometry current. The clean
capture target runs app/E2E typechecks first and emits a complete atomic
size/SHA-256 manifest only after all 15 states succeed.

Steps:

1. Complete Mandatory Gate B.
2. Split the current `hero-world.tsx` into stage, route, pointer, material, and
   assembly ownership boundaries.
3. Add the serializable hero contract/controller and full reference-state
   schema.
4. Make `PegasoftHome` create the journey snapshot once; the DOM and scene
   consume it rather than recomputing thresholds.
5. Keep the world root fixed and make the camera the only initial owner of the
   field-approach composition change.
6. Add an Nx-owned app unit-test target for controller, sequence, route,
   camera, local-clock reset, and profile selection.
7. Add E2E-only named-state/progress control outside the production bundle.
8. Lock viewport, DPR, fonts, random seed, and local-effect time for captures.
9. Prove that two captures of the same state are pixel-stable enough for useful
   overlays and heatmaps.

Artifact:

- clean module graph, app unit target, deterministic named-state harness, and
  useful Canvas-disabled fallback.

Stop/go gate:

- the scene has no document-scroll listener, DOM query, duplicated thresholds,
  or Three.js object in evidence data;
- direct state entry is independent of traversal history;
- repeated captures at one state have no unexplained difference;
- forward, reverse, jump, resize, and restored-scroll proxy checks converge.

Nx verification:

```sh
pnpm nx test @site/pegasoft
pnpm nx lint @site/pegasoft
pnpm nx build @site/pegasoft
pnpm nx run @site/pegasoft-e2e:e2e
```

The app test target passes 38 tests, and the independent browser convergence
and repeat-capture checks now close the remainder of this phase's own gate.
Phase 1 still prevents ordered acceptance and still permits replacement of
unproven visual constants.

### Phase 6 — lock DOM layout, lifecycle, and progress mappings

Status: own gate passed on the 2026-07-30 current checkpoint; ordered
acceptance held at Phase 1.

Evidence: one raw physical-progress source feeds explicit DOM and scene mapping
curves. The recording-desktop scene curve is fitted to the locked
live-to-recording calibration, DOM handoffs use the same controller-owned scene
target, and the current manifest-verified capture passes all 13 applicable DOM
contracts—including the container and every header, number, title, and body in
the four-row ladder—with zero failures or blocked checks. Removing the
duplicate `48px` wrapper inset aligned the container without moving its rows.
Current profile-aware convergence and horizontal-overflow browser checks also
pass.

Steps:

1. Implement one raw normalized journey progress source.
2. Define explicit, controller-owned DOM and scene mapping curves; do not force
   them to share identical thresholds.
3. Implement `loading`, `landing`, `journey`, and `exit` lifecycle states.
4. Match fixed header, landing-copy container, process-copy ladder, active
   number tile, vertical rule, collapsed rows, sticky heights, and next-section
   boundary.
5. Lock desktop and mobile page heights without requiring the final 3D world.
6. Test every copy handoff around both sides of its threshold.

Artifact:

- DOM-only reference captures and tested lifecycle/progress map.

Stop/go gate:

- copy/header bounds pass the accuracy contract;
- every copy transition occurs in reference order with no dead zone;
- forward, reverse, jump, and restored reload choose the same DOM state;
- scene-independent page layout has no horizontal overflow.

### Phase 7 — fit proxy world topology and canonical route

Status: not accepted.

Steps:

1. Render only simple labeled destination proxies and an unbounded proxy
   ground.
2. Fit inter-destination spacing, relative placement, and continuous route
   topology to source screen-space evidence.
3. Define one canonical route shared by line rendering, beam tip, route frames,
   contact events, camera sampling, and tests.
4. Lock route knots, entry/contact/exit points, tangents, and proxy landmark
   bounds.
5. Do not add monument detail, world rotation, materials, fog, glow, or bloom.

Artifact:

- canonical route data, proxy world, and structural capture report.

Stop/go gate:

- route/contact tolerances pass at every structural anchor;
- proxy landmark centers/scales and negative-space occupancy pass;
- no platform edge or dark void appears;
- all route consumers produce the same sampled points.

### Phase 8 — solve static camera anchors before interpolation

Status: not accepted.

Solve the high-information compositions in this order:

1. `landing` around `5.0s`;
2. `activation-route`/first handoff around `10.0–12.5s`;
3. `clearance-travel` around `17.5–18.0s`;
4. `clearance-field-preview` around `20.5s`;
5. `field-contact` around `22.5s`;
6. `arrival-lockup` around `30.5s`;
7. `journey-exit` around `31.4–32.0s`.

For each anchor:

1. Hold progress and local time fixed.
2. Fit projection/FOV, camera position/quaternion, focus target, and proxy
   bounds.
3. Keep the world-root transform at identity.
4. Lock copy/landmark/route/negative-space measurements before proceeding.

Artifact:

- measured camera poses and passing static-anchor reports.

Stop/go gate:

- every anchor passes the accuracy contract independently;
- changing a later camera pose does not move an earlier frozen anchor;
- no camera pose depends on prior traversal.

### Phase 9 — implement camera interpolation and smoothing

Status: not accepted.

Steps:

1. Fit route/camera interpolation between the frozen poses.
2. Reproduce the camera-owned field-approach composition turn.
3. Match approximately `0.15s` desktop and `0.10s` mobile damping through the
   measured settling criteria, not arbitrary lerp values.
4. Sample every interval at start, `25%`, `50%`, `75%`, and end; sample the
   field-approach turn more densely.
5. Verify monotonic camera-axis change and beam-relative continuity.
6. Test slow scrub, fast scrub, reverse, jump, resize, and restored position.

Artifact:

- interpolation curves, smoothing tests, and intermediate-state overlays.

Stop/go gate:

- no snap, 90°/180° flip, compounded world/camera turn, clipping, scale
  discontinuity, or residual divergence remains;
- all frozen static anchors still pass.

### Phase 10 — match loader, world reveal, and landing

Status: not accepted.

Implementation order:

1. start from the already-correct frozen `landing` composition;
2. match the reset field and square/ring assembly across `0.9–1.8s`;
3. match `loader-mark` at exact frames in `1.9–3.1s`;
4. match `world-reveal` across `3.2–3.7s`;
5. match the 3D headline/body reveal across `3.8–4.4s`;
6. match the resolved `landing-idle` composition;
7. implement four-path rail packets with measured stagger, draw, retract, and
   respawn ranges;
8. stop new packet spawning when journey progress leaves zero and hand off
   cleanly to scroll.

Artifact:

- deterministic loader time strip, landing comparison report, and local
  landing-clock tests.

Stop/go gate:

- event boundaries are within the time tolerance;
- loader geometry, contours, header/copy/world layering, and landing bounds
  pass;
- there is no blank frame or unrelated intermediate camera pose;
- the journey does not inherit loader elapsed time.

### Phase 11 — match Step 01 activation

Status: not accepted.

Steps:

1. Replace the activation proxy with the measured city/first-destination
   silhouette.
2. Fit red feeder routes and the converging outbound centerlines.
3. Match route thickness, tangents, destination contact, and red ownership.
4. Match the Step 01 process-copy transition.
5. Verify the red route at start, quarter, midpoint, three-quarter, and
   contact-near samples in both directions.

Artifact:

- grayscale activation module and Step 01 structural report.

Stop/go gate:

- activation silhouette, red route, copy state, and camera all pass;
- the route remains thin, red, continuous, and spatially anchored;
- no blue overlap/gap appears before the measured handoff.

### Phase 12 — match Step 02 clearance and desktop pointer trail

Status: not accepted.

Steps:

1. Replace the clearance proxy with measured industrial silhouettes and open
   transit space.
2. Implement the red-to-blue contact as one continuous event.
3. Fit the first blue route, bright tip, wake, and camera travel through the
   frozen preview anchor.
4. Raycast fine-pointer desktop input onto visible ground and write the local
   fading trail in correct projected coordinates.
5. Match trail centroid, radius, velocity response, falloff, and persistence.
6. Omit listener, trail texture/shader, touch substitute, and pointer camera
   displacement from coarse-pointer/mobile profiles.
7. Keep Step 02 active while the field first previews.

Artifact:

- grayscale clearance module, route-handoff report, and desktop/mobile
  interaction probes.

Stop/go gate:

- route/camera/contact remain synchronized through the whole interval;
- desktop projected trail centroid stays within `12px` of the measured floor
  intersection and passes the visual tolerances;
- coarse-pointer/mobile creates no desktop-only interaction branch;
- clearance and field-preview frozen states still pass.

### Phase 13 — match Step 03 field, approach, and pulse

Status: not accepted.

Steps:

1. Reconstruct the measured tile count, irregular field outline, central tile,
   figure, spacing, height, and contact point.
2. Fit the camera-only approach turn from preview to the frozen contact pose.
3. Keep the world root fixed and camera-axis change monotonic.
4. Implement `field-pulse-a` from the first authoritative pulse frame.
5. Implement `field-pulse-b` from a materially different later pulse/reset
   frame.
6. Match pulse origin, lit-tile membership, band radius/width, brightness,
   cadence, repeat, and falloff.
7. Test stationary continuation, reverse-below-contact reset, deterministic
   re-entry, and direct-state phase injection.

Artifact:

- grayscale field module, dense approach overlays, pulse time strips, and
  pulse/reset tests.

Stop/go gate:

- field silhouette/contact/camera/pulse states pass;
- no world-root rotation, snap, route discontinuity, or unstable pulse phase
  remains;
- arrival work does not begin until both pulse states are frozen.

### Phase 14 — match Step 04 arrival and journey exit

Status: not accepted.

Steps:

1. Fit the field-exit tangent, second blue route, horizontal feed, and
   dotted/ambient wake.
2. Reconstruct the arrow silhouette and surrounding square/diamond marks.
3. Match `arrival-travel`, Step 04 copy activation, and `arrival-lockup`.
4. Hold the lockup long enough to become readable before starting retreat.
5. Match retreat direction/magnitude, arrow scale loss, world coverage, and
   white-section boundary at `journey-exit`.
6. Implement the arrival mark's progress-gated local clock and reverse reset.

Artifact:

- grayscale arrival module, lockup/exit reports, and arrival-clock tests.

Stop/go gate:

- arrow/feed/marks/copy/camera pass at travel, lockup, and exit;
- no premature retreat, second composition flip, world edge, or blank handoff
  appears;
- all earlier frozen states remain in tolerance.

### Phase 15 — run the full chronological desktop motion pass

Status: not accepted.

Steps:

1. Connect every accepted state through the explicit controller curves.
2. Verify DOM copy and scene thresholds separately while retaining one raw
   progress owner.
3. Run the recording sequence at normal, slow, and fast user scroll.
4. Run the full journey backward.
5. Jump directly to every named state and across every threshold.
6. Reload at restored positions and resize within/between desktop profiles.
7. Check loader, idle rails, pulse, and arrival clocks for deterministic
   ownership and reset.
8. Re-run all static-anchor measurements after motion integration.

Artifact:

- complete forward/reverse/jump traces and chronological comparison report.

Stop/go gate:

- state order, route/camera/copy contact, damping, and local clocks match with
  no dead zone, double trigger, history dependence, or reopened static state;
- structural work is frozen before art direction begins.

### Phase 16 — apply desktop art direction and final interaction nuance

Status: not accepted.

Steps:

1. Tune palette, materials, lighting, fog, atmosphere, shadows, beam core,
   glow, trail, and surface response at the recording profile.
2. Match typography weight, tracking, line-height, and 3D copy entrance/exit
   after containers are already locked.
3. Add the subtle measured fine-pointer camera displacement only now.
4. Calibrate flat colors before fog/glow and micro-detail.
5. Re-run all geometry, route, camera, and negative-space measurements after
   each global material/lighting change.
6. Validate at both live desktop profiles after the recording profile passes.

Artifact:

- desktop accuracy matrix and source-linked comparison report.

Stop/go gate:

- every desktop state passes structural and color tolerances;
- no art change moves a frozen composition out of tolerance;
- no world edge, z-fighting, console, hydration, or WebGL error remains.

### Phase 17 — author tablet and mobile profiles

Status: not accepted.

Steps:

1. Measure remaining live tablet/mobile journey states before implementing
   them; the desktop recording cannot supply this evidence.
2. Define explicit camera, copy, journey-height, geometry-detail, DPR, cue, and
   asset/profile rules rather than scaling desktop values.
3. Match the `390x844` landing measurements, `64px` header, bottom scroll cue,
   compact centered copy, and approximately `570svh` mobile journey.
4. Repeat the structural anchor order on mobile.
5. Preserve the explicit absence of the desktop pointer trail/parallax on
   coarse-pointer/mobile.
6. Verify orientation change, resize, and device DPR boundaries.

Artifact:

- tablet/mobile evidence manifest, profile configuration, and viewport matrix.

Stop/go gate:

- every claimed responsive state has live evidence;
- mobile/tablet anchors and transitions pass profile tolerances;
- no overflow, clipped primary landmark, desktop-only pointer behavior, or
  accidental desktop camera scaling remains.

### Phase 18 — reduced motion, fallback, and accessibility

Status: not accepted.

Steps:

1. Build reduced-motion states from already accepted full-motion
   compositions:
   - no 3D copy tilt or continuous camera travel;
   - no pointer trail, idle packet loop, or pulse loop;
   - discrete pose handoffs with an optional short opacity transition;
   - static red landing route, one luminous field band, and resolved arrival.
2. Make every reduced-motion state settle within `100ms` while preserving
   full-motion landmark/copy bounds.
3. Verify useful WebGL-disabled/static fallback, keyboard order, focus,
   contrast, header/menu behavior, and axe results.

Artifact:

- accessibility report and fallback/reduced-motion matrix.

Stop/go gate:

- every named state and behavior passes on desktop, tablet, mobile,
  reduced-motion, and fallback paths;
- keyboard, focus, contrast, menu, heading order, and axe checks pass;
- reduced motion introduces no layout drift or competing clock.

### Phase 19 — performance, bundle hygiene, and final cutover

Status: not accepted.

Steps:

1. Profile frame time, DPR, draw calls, geometry/material counts, asset weight,
   memory, and long tasks on the locked representative hardware.
2. Meet at minimum:
   - LCP below `2.5s`;
   - CLS below `0.1`;
   - desktop p95 frame time at or below `16.7ms` at the accepted desktop DPR;
   - mobile p95 frame time at or below `33.3ms` at the accepted mobile DPR;
   - no steady-state main-thread task above `50ms` during scrub.
3. Optimize only in ways that keep all frozen visual states inside tolerance.
4. Remove proxy geometry, diagnostics, temporary adapters, unused primitives,
   dead selectors, and production test-control paths.
5. Audit production output for legacy and temporary payload.
6. Run the full profile/state/behavior matrix from a fresh production build.
7. Update this plan and the observation notebook with final evidence.

Artifact:

- performance/bundle report, final comparison matrix, and cutover record.

Stop/go gate:

- every Phase 18 state/profile/accessibility gate remains green;
- the LCP, CLS, frame-time, and long-task budgets pass on locked hardware;
- fresh Nx tasks pass;
- no legacy, diagnostic, or temporary payload ships;
- the definition below is fully evidenced.

Hard rule: if a phase fails, work returns to that phase. No downstream polish
may be used to disguise an upstream geometry, camera, progress, or ownership
failure.

## Verification protocol

For every named state:

1. Open the current live state or seek the authoritative recording frame.
2. Set Pegasoft to its mapped journey progress without scroll momentum.
3. Use the same viewport and DPR.
4. Compare copy/header bounds, camera direction, landmark bounds, negative
   space, route state/thickness, context visibility, and world-edge exposure.
5. Fix structure before materials, glow, or micro-detail.
6. Repeat on reverse entry and direct progress jump.

Behavioral coverage must include:

- forward, reverse, scrollbar jump, resize, reload with restored scroll, and
  route-state determinism;
- bounded camera smoothing with no lingering divergence after input stops;
- no blank frame between loader, world reveal, and landing;
- landing idle route cadence and clean scroll takeover;
- continuous red-to-blue-to-field-to-arrival route;
- fine-pointer desktop trail and explicit absence on coarse-pointer/mobile;
- camera-owned field-approach composition change with fixed world root;
- pulse start, repeat, reverse reset, and re-entry restart;
- close arrow arrival and clean journey exit;
- mobile/tablet profile behavior, no horizontal overflow, and useful fallback;
- reduced-motion named compositions;
- no hydration, console, WebGL, z-fighting, or world-edge error;
- no legacy symbol or duplicate scene system in production output.

Run repository tasks through Nx:

```sh
pnpm nx test @site/pegasoft
pnpm nx lint @site/pegasoft
pnpm nx build @site/pegasoft
pnpm nx lint @site/pegasoft-e2e
pnpm nx run @site/pegasoft-e2e:typecheck
pnpm nx run @site/pegasoft-e2e:e2e
```

The Nx-owned app unit target now exists and currently passes 38 tests. Browser
and comparison gates remain independent; unit success cannot accept a visual
phase.

## Definition of baseline complete

The hero baseline is complete only when:

- the live site and identified recording are the only visual authorities;
- all prior completion claims remain replaced by evidence-backed phase gates;
- no external scratch path, generated screenshot, or opaque reference alias
  appears in implementation or acceptance metadata;
- only one active route, camera, beam, world, progress, and fallback system
  ships;
- legacy hero source, imports, CSS, DOM, dependencies, and bundle strings are
  absent;
- one page-owned journey snapshot synchronizes DOM copy and WebGL;
- every named state has a source frame/viewport and passing comparison;
- reverse, jump, resize, and restored-scroll behavior are deterministic;
- camera smoothing and field approach match the source without a compounded
  world rotation;
- desktop pointer behavior and mobile omission match the current live site;
- field layout and pulse are measured rather than inherited;
- arrival and journey exit match the reference structure;
- desktop, tablet, mobile, reduced-motion, WebGL-fallback, and keyboard paths
  are useful;
- fresh Nx unit, lint, build, E2E typecheck, and E2E tasks pass;
- performance and production-bundle checks show no legacy payload.

## Scope guardrails

- Preserve Pegasoft's identity and content. Reproduce the reference's
  interaction grammar and art-direction structure, not Vectr's brand or copy.
- Hero implementation, process-copy synchronization, fallback, direct
  dependencies, directly related tests, and removal of proven dead hero blocks
  are in scope.
- Unrelated page redesign, content strategy, and downstream sections are out
  of scope.
- Do not tune decorative detail before evidence, hygiene, contract, route,
  camera, and silhouette gates pass.
- Do not keep an old renderer “just in case.” Preserve history safely, then
  keep the production implementation singular.
