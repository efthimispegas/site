# Vectr Hero Motion Map

Status: working observation notebook; not a source of truth
Last reviewed: 2026-07-30

## Authority

This file summarizes observations. It is never design evidence by itself.

The only visual authorities are:

1. the current production hero at [vectrfl.com](https://www.vectrfl.com/);
2. the repository recording,
   [vectrfl_recording.mov](./vectrfl_recording.mov).

All generated frames and screenshots are disposable inspection aids. Every
implementation or acceptance record must point back to the live URL or a
recording timestamp/frame. All external scratch references and the opaque
`vectr-ref2-*` aliases are obsolete.

## Recording identity

- SHA-256:
  `de2d5e03a9bb8c1ef93278088f9f205b48710a3ce9568a648b96d619cfaeb321`;
- H.264, progressive BT.709, no audio;
- `3016x1522`, `1980` frames;
- nominal `60fps`, average approximately `59.97fps`;
- duration `32.927833s`.

The recording contains a user-controlled scroll. Timestamps are comparison
anchors, not authored motion durations. It contains no mobile, tablet, resize,
touch, breakpoint, or reduced-motion evidence.

## Verified desktop recording ladder

| Recording time  | Verified visual state                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `0.0–0.8s`      | Already-resolved hero remains visible before the apparent reload.                                   |
| `~0.9s`         | Pale field and tiny central blue squares appear.                                                    |
| `1.0–1.8s`      | Squares orbit/assemble; thin oversized elliptical contours sweep around them.                       |
| `1.9–3.1s`      | Loader resolves into the blue arrow/brand mark.                                                     |
| `3.2–3.7s`      | Industrial world, red rails, and header compose into view.                                          |
| `3.8–4.4s`      | Headline tilts/translates into place, followed by body copy.                                        |
| `4.4–8.4s`      | Resolved landing; intermittent red rail packets continue while idle.                                |
| `~8.5s`         | Scroll begins; landing copy rotates/translates out and process copy enters.                         |
| `8.8–9.0s`      | Step 01, “Activation, simplified,” is established.                                                  |
| `9.0–13.3s`     | Red route travels toward its first destination; cyan/blue handoff cues begin later in the interval. |
| `13.4–13.6s`    | Step 02, “Cleared to count,” becomes active.                                                        |
| `13.5–20.4s`    | Blue route crosses broad industrial context.                                                        |
| `~20.5s`        | Tile field starts previewing while Step 02 remains active.                                          |
| `~22.0s`        | Step 03, “Proven field match,” becomes active in a strongly top-down composition.                   |
| `22.5–29.3s`    | Contact holds while bright square/ring tile bands repeatedly expand and reset.                      |
| `29.4–29.6s`    | Step 04, “Seamless arrival,” becomes active.                                                        |
| `30.0–31.2s`    | Large frontal blue arrow lockup dominates with horizontal cyan feed and surrounding marks.          |
| `~31.4s onward` | The following white content section enters.                                                         |

## Current live-site audit

Observed on 2026-07-26 at `1440x900`, `1920x1080`, and `390x844`:

- fixed full-viewport pale-blue WebGL world behind fixed DOM copy;
- fixed desktop header and compact mobile header/menu;
- centered landing copy with pronounced 3D entrance and scroll exit;
- persistent industrial context containing buildings, workers, turbines,
  rails, vehicles, and distant infrastructure;
- intermittent landing red route packets;
- four pinned process-copy states;
- desktop fine-pointer trail and subtle pointer camera displacement;
- no pointer trail, raycast, listener, shader branch, or touch equivalent on
  mobile/tablet;
- compact centered mobile copy, visible bottom scroll cue, and a taller mobile
  flow;
- separate desktop and lighter mobile scene assets;
- no dedicated reduced-motion branch in the public reference.

Live implementation measurements:

- DOM step thresholds: `0.191`, `0.697`, `0.876`;
- red route: `0–0.17`;
- first blue route: `0.17–0.74`;
- field/contact reveal: `0.72–0.75`;
- camera composition change: `0.72–0.85`;
- second blue route: `0.74–0.90`;
- arrival mark: elapsed-time reveal/retract after/before `0.90`;
- final camera retreat continues through progress `1.25`;
- camera damping: approximately `0.15s` desktop and `0.10s` mobile;
- field pulse: elapsed-time driven after `0.72`, reset below that gate;
- desktop pointer trail: floor raycast into a fading `256x256` trail texture,
  with radius influenced by pointer velocity;
- mobile flow height: desktop flow height multiplied by `1.25`.

These values describe the current reference implementation. They are
measurement inputs, not Pegasoft constants to copy without same-viewport
comparison.

## Corrected interpretation

1. The reference has one raw scroll journey but not one universal threshold
   map. DOM copy and scene/camera use different mappings.
2. Camera progress is damped. Acceptance should reject lingering or divergent
   lag, not all reference-like smoothing.
3. The dotted local interaction is desktop fine-pointer behavior. “Mouse/touch
   activation” is false for the current live site.
4. The current live world/GLB root is not rotated at stage 03. The prominent
   apparent reorientation is produced by camera position/quaternion changes.
5. The recording supports route/camera continuity and one prominent top-angle
   composition change. It cannot prove internal world topology, a fixed
   beam-relative rig, or the owner of a transform.
6. Cardinal world claims such as “south-west/south/west” are unsupported
   without an explicit coordinate system. Use screen-space bounds and route
   topology.
7. The field pulse visibly repeats in the recording. The live source confirms
   that it uses local elapsed time after a progress gate.
8. Elapsed time also drives landing packets, workers, smoke, turbines, the
   field pulse, and the arrival mark.
9. Subtle desktop pointer parallax and the pronounced 3D copy transforms are
   current reference behavior; both were incorrectly excluded by the earlier
   plan.
10. The final reference camera retreats only after the arrow becomes readable
    and carries the journey into the next section.

## Visual sequence

### Loader and landing

- An orbiting square/ring treatment resolves into the blue brand arrow.
- Oversized elliptical contours frame the loader.
- The industrial world composes into the lower viewport before the hero copy
  fully settles.
- The centered heading arrives with visible perspective rotation/translation.
- Red route packets continue intermittently until journey scroll begins.

### Step 01 — activation

- Process copy pins on the left.
- Thin red architectural paths originate around buildings, converge, and lead
  toward the first handoff.
- Camera movement and route activity preserve spatial travel rather than
  presenting an isolated monument.

### Step 02 — clearance

- The route changes into a cyan/blue illuminated path.
- The camera travels across broad industrial context.
- Desktop pointer movement creates a local fading floor trail through a
  raycast-based texture; mobile/tablet omits this branch.
- The field previews before Step 03 copy becomes active.

### Step 03 — field match

- The camera moves into a strongly top-down composition.
- A large irregular field of separated rounded white tiles surrounds an
  elevated saturated-blue center and figure.
- Contact produces repeated outward square/ring bands while the center remains
  stable.

### Step 04 — arrival and exit

- A horizontal cyan feed enters a large frontal blue arrow.
- Small square/diamond marks surround the arrow.
- Once readable, the camera continues its measured retreat into the following
  content section.

## Implementation invariants supported by evidence

1. One continuous journey and route system must explain all four steps.
2. One page-owned raw progress source should feed explicit DOM and scene
   mapping curves.
3. Camera composition, route activity, and copy must remain deterministic
   under forward, reverse, and direct progress changes.
4. The world starts fixed; one camera-owned field-approach transition is the
   evidence-backed default.
5. Desktop fine-pointer trail/parallax and mobile omission are separate motion
   profiles.
6. Landing packets, field pulse, and arrival mark have explicit local clocks
   and progress-gated reset rules.
7. The field and arrow are measured destinations, not inherited local
   geometry.
8. Mobile is an authored responsive profile, not a scaled desktop camera.

## Remaining measurements

- Exact recording frame numbers are now locked for all 15 states.
- Deterministic recording analysis now measures seven landmarks
  (`loader-mark`, `world-reveal`, `activation-route`, `activation-contact`,
  `field-contact`, `field-pulse-b`, and `arrival-lockup`) and
  12 visible route cores, 11 visible copy-ink envelopes, plus the
  `journey-exit` section boundary. Every
  applicable route state is measured; `loader-mark`, the exact `landing`
  frame, and `journey-exit` correctly mark route bounds not applicable. Four
  route/transition-primary states correctly mark landmark bounds not
  applicable. Four landmark-primary states remain explicitly blocked because
  the semantic subject cannot be isolated without a reviewed source-tied mask
  or because only a partial/effect-only feature is visible.
- Copy ink is measured for both landing anchors and nine fully readable
  process-ladder anchors. `arrival-travel` remains blocked because its body is
  faded into similar-valued field/route pixels; `journey-exit` remains blocked
  because the clipped ladder overlaps the fixed header. Neither box is copied
  from a cleaner neighboring frame.
- All 15 states now carry an observed 4x4 edge-support distribution, global
  edge density, and screen-space centroid below the fixed-header band. These
  are reproducible composition/negative-space proxies, not reconstructed 3D
  camera positions or quaternions. The actual camera transform remains
  unknown from the recording and is not used as a source acceptance gate.
- The current atomic implementation capture uses that same renderer-independent
  algorithm for all 15 screenshots. Its 285 composition checks pass 191 and
  fail 94: global negative-space occupancy passes 14/15, centroid axes pass
  5/30, and fixed-grid occupancy passes 172/240. These failures are current
  calibration evidence, not visual acceptance.
- The schema-v4 capture measures all 11 source-applicable
  implementation copy-ink envelopes and the `journey-exit` boundary with the
  source-derived predicates. Copy bounds pass 18/44 checks; the boundary
  passes 4/4. Source-blocked `arrival-travel` and `journey-exit` copy are not
  inferred from neighboring frames.
- The same capture runs all 12 locked source route configurations against the
  implementation screenshots. Only `activation-route` and
  `activation-contact` contain source-qualifying route pixels; their endpoint,
  equivalent-thickness, and direction proxies pass 5/12 checks. The other ten
  routes remain explicit quality blocks, and the PCA core-envelope proxy does
  not satisfy the still-missing centerline Hausdorff measurement.
- Live DOM contracts now cover the two landing and 11 journey states at the
  recording CSS profile; all 13 applicable contracts pass in the same current
  comparison run.
- Remaining screen-space work includes the four blocked landmark-primary
  states, complete route paths, copy/scene correspondence, field outline, and
  negative space;
- route thickness and handoff/contact frames at matched viewports;
- exact field tile boundary/count and pulse band profile;
- pointer trail radius/falloff and camera displacement on representative
  desktop hardware;
- tablet composition and interaction branch;
- mobile composition on physical hardware;
- Pegasoft reduced-motion/static compositions, because the public reference
  provides no dedicated model;
- performance and DPR budgets for the procedural Pegasoft implementation.

When later observation changes a statement here, update the observation and
the implementation plan together. Do not preserve a contradicted claim for
historical continuity.
