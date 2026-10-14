---
target: website hero
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/whiskey/Work/site/apps/pegasoft/src/app/shared/pegasoft-home.tsx"
target_fingerprint: "sha256:672e10d29e6a052feada37a8950e19a567f7b3470182a0e509674fc0483e16f0"
target_path: /Users/whiskey/Work/site/apps/pegasoft/src/app/shared/pegasoft-home.tsx
timestamp: 2026-09-28T17-03-03Z
slug: apps-pegasoft-src-app-shared-pegasoft-home-tsx
---
Method: dual-agent (A: /root/design_assessment · B: /root/detector_assessment)

# Pegasoft hero critique — 2026-09-28

Target: `apps/pegasoft/src/app/shared/pegasoft-home.tsx`. Authority: `docs/pegasoft-hero-baseline-plan.md`, Phase 16. Desktop was inspected in a fresh tab at 1280×720; mobile screenshots, complete load timing, and reference-frame fidelity were not verified in this run.

## Design health

| # | Nielsen heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Loader communicates arrival, but long readiness has no wait estimate. |
| 2 | Match with the real world | 3 | Plain delivery language, though some labels require interpretation. |
| 3 | User control and freedom | 3 | Navigation and process buttons provide exits; the scroll journey is long. |
| 4 | Consistency and standards | 3 | Consistent type and actions; process controls look like labels. |
| 5 | Error prevention | 3 | Low-risk surface and distinct route destinations. |
| 6 | Recognition rather than recall | 2 | Current process step is visual only; abstract forms require interpretation. |
| 7 | Flexibility and efficiency | n/a | No expert workflow on this marketing surface. |
| 8 | Aesthetic and minimalist design | 3 | Strong hierarchy; repeated feature glyphs add little meaning. |
| 9 | Error recovery | 2 | Fallback exists in source, but recovery was not visible in the inspected state. |
| 10 | Help and documentation | n/a | No task help is needed for the primary action. |
| **Total** | | **21/32** | **Acceptable, with material fidelity and semantics gaps** |

## Design specificity

The delivery-rigor copy and four-step story are Pegasoft-specific. The pale field, abstract white scene blocks, and repeated pastel feature tiles are more interchangeable. The rendered visuals do not yet make the promised work or reference journey concrete. Cognitive load is moderate: one main opening action and four process options, but the process controls and scene demand inference. The emotional sequence moves from a confident promise to an abstract journey, then to reassurance and booking; visible proof is thin near the strongest claims.

The CLI detector returned `[]` for the target after the engine became available. It did not overturn the manual/source findings. A fresh browser overlay was unavailable: the second browser session stalled in `initializing`, and screenshot capture timed out. The earlier `scale(0)` critique was a false positive for a content entrance; `hero-shell.module.css:388` animates only a decorative `::before` marker background.

## What works

1. Large opening hierarchy and one clear primary action.
2. A scannable four-step journey linked to the delivery promise.
3. Clear distinction between exploratory Concept Lab and approved client work.

## Priority issues

1. **P1 — Scene fidelity.** The desktop opening and process visuals use abstract structures whose silhouette, surface, depth, and energy response still need matched reference review. Correct landing, first-scroll, and activation as one connected slice before expanding approximations. Suggested command: `$impeccable polish` after Phase 16 reference comparison.
2. **P1 — Process semantics.** Four flow controls lack an announced selected/current state and an explicit relation to the changing description (`pegasoft-home.tsx:754-800`). Add state and description linkage without altering the visual journey. Suggested command: `$impeccable audit`.
3. **P2 — Arrival pacing.** Scene readiness plus a minimum 3.5-second clock and 1.5-second copy entrance can delay useful content (`pegasoft-home.tsx:242-251`; `hero-shell.module.css:167-225`). Measure a fresh complete load at desktop and mobile before tuning. Suggested command: `$impeccable optimize`.
4. **P2 — Motion cost and continuity.** Scroll progress drives per-frame work, layout transitions, and a 72-instance pointer trail (`pegasoft-home.tsx:428-474`; `hero-shell.module.css:397-433`; `hero-pointer-trail.tsx:54-98`). Profile slow, fast, reverse, and idle behavior on target hardware. Suggested command: `$impeccable animate`.
5. **P2 — Proof near the promise.** Claims of engineered quality and honest proof are not accompanied by a concrete example on the homepage (`pegasoft-home.tsx:28-49,811-862`). This is a content decision outside Phase 16 and must preserve agreed copy until separately authorized. Suggested command: `$impeccable shape`.

## Persona red flags

- **First-time founder:** Can find the booking action, but abstract visuals and phrases such as “operating map” may not explain what the first engagement delivers.
- **Distracted mobile visitor:** A long journey and readiness gate may delay useful content; mobile timing was not verified here.
- **Assistive-technology visitor:** Flow descriptions are exposed beside four buttons without an announced active state. FAQ buttons do announce expanded/collapsed state.

## Minor observations

Focus styling and mobile-menu Escape/focus restoration exist in source. Mobile flow buttons are styled at 40px high in `hero-shell.module.css:587-595`; rendered hit area needs later confirmation. The repeated pastel feature glyphs add less specificity than the main journey.

## Questions to consider

- Which concrete approved deliverable or result could substantiate the quality promise near the first viewport without changing the agreed hero copy?
- Who is the primary buyer behind “ambitious studios” relative to founders and product teams?
- Which exact landing-to-activation frame is the strongest visual standard for this Phase 16 pass?
