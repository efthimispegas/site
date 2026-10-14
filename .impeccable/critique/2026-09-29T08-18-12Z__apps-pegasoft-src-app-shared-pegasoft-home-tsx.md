---
target: existing hero framework structure
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/whiskey/Work/site/apps/pegasoft/src/app/shared/pegasoft-home.tsx"
target_fingerprint: "sha256:672e10d29e6a052feada37a8950e19a567f7b3470182a0e509674fc0483e16f0"
target_path: /Users/whiskey/Work/site/apps/pegasoft/src/app/shared/pegasoft-home.tsx
timestamp: 2026-09-29T08-18-12Z
slug: apps-pegasoft-src-app-shared-pegasoft-home-tsx
---
Method: independent design assessment; detector rerun in parent after browser assessment stalled.

# Pegasoft hero framework structure — 2026-09-29

Target: `apps/pegasoft/src/app/shared/pegasoft-home.tsx` and its active `hero-scene` modules. This is a source review. A fresh visual render, mobile view, load timing, keyboard flow, and GPU cost were not verified because localhost:3000 refused connection and the browser assessment did not complete.

## Design health

| # | Nielsen heuristic | Score | Structural evidence |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Readiness is tracked internally, but the loader exposes no useful progress/status. |
| 2 | Match with the real world | 3 | The four-step industrial journey supports the delivery story. |
| 3 | User control and freedom | 2 | Scroll controls exist, but a hidden landing button remains focusable and the loader locks scrolling. |
| 4 | Consistency and standards | 2 | The process buttons lack announced current state and description linkage. |
| 5 | Error prevention | 3 | Canvas failure has a fallback boundary. |
| 6 | Recognition rather than recall | 3 | Numbered steps help orientation, though selected state is mainly visual. |
| 7 | Flexibility and efficiency | n/a | No expert workflow on this marketing surface. |
| 8 | Aesthetic and minimalist design | 3 | Restrained UI hierarchy; scene fidelity still needs matched reference review. |
| 9 | Error recovery | 2 | A fallback is implemented, but its live experience was not inspected. |
| 10 | Help and documentation | n/a | Not applicable to the primary marketing action. |
| **Total** | | **20/32** | **Acceptable, source-only estimate** |

## Design specificity

The scroll-led industrial city, red feeders, blue travel, field pulse, and arrival mark are product-specific. The framework gives that sequence a coherent physical path. The current landing graphics and activation inventory are authored in separate locations with independent visibility thresholds, which makes the first visual handoff more fragile than the underlying progress model. The CLI detector returned `[]`; it did not detect the source-level structural and semantic issues below. No browser overlay was confirmed.

## What works

1. The page measures physical scroll once, derives a journey snapshot, and passes it to one rendered-frame owner before camera and stage consumers use it (`pegasoft-home.tsx:428-467`, `hero-frame-owner.tsx:11-32`).
2. Canvas readiness waits for an applied frame and has context-loss/error fallback handling (`hero-scene.tsx:242-252,363-386`).
3. The numbered process and stable red-to-blue spatial story give the hero a recognizable structure rather than disconnected effects.

## Priority issues

1. **P1 — Stage composition has split ownership.** `hero-world.tsx:17-62` selects shared activation objects by ID; `stages/activation.tsx:11-24,90-109` selects another subset and gates it at progress `0.03`; `stages/landing-graphics.tsx:18-26,116-126` owns separate landmark coordinates and a `0.28-0.36` disappearance gate. This can make the landing-to-activation silhouette and continuity drift as Phase 16 geometry changes. Keep an explicit stage inventory and shared-context contract, then compare matched landing and first-scroll frames. Suggested command: `$impeccable polish`.
2. **P1 — Process state is visual rather than semantic.** Four buttons and changing descriptions rely on CSS/data attributes; no current-state announcement or button-to-description link is exposed (`pegasoft-home.tsx:754-799`). Give each step an announced active state and an explicit relation to its description. Suggested command: `$impeccable audit`.
3. **P1 — Hidden landing control can remain in the focus order.** The landing exit styles hide the scroll label visually, while the button remains mounted and enabled (`pegasoft-home.tsx:719-749`, `hero-shell.module.css:162-165,298-305`). Make the control unfocusable when the landing state has exited and verify forward/reverse keyboard navigation. Suggested command: `$impeccable harden`.
4. **P2 — Loader pacing couples usefulness to graphics readiness.** Page scroll stays locked until Canvas is ready and the loader clock reaches 3.5 seconds (`pegasoft-home.tsx:242-290`); the deadline starts when renderer creation begins (`hero-scene.tsx:212-225,254-283`). Measure fresh desktop/mobile loads and pre-render stalls before adjusting the gate. Suggested command: `$impeccable optimize`.
5. **P2 — Responsive and render cost are unmeasured structural risks.** Fixed process body heights with overflow clipping (`hero-shell.module.css:421-495`) and an always-running shadowed Canvas with all stages mounted (`hero-scene.tsx:342-372`, `hero-world.tsx:35-62`) need zoom, device, and frame-time checks. Preserve the single frame owner while tuning only measured bottlenecks. Suggested commands: `$impeccable adapt`, `$impeccable optimize`.

## Persona red flags

- **First-time visitor:** The four process titles look like labels; the current step and its scene relationship may be unclear.
- **Keyboard/screen-reader visitor:** An invisible landing button may receive focus, and changing process state is not announced.
- **Distracted mobile visitor:** The mandatory loader and clipped fixed-height descriptions could delay or hide useful content; mobile was not inspected.

## Minor observation

`pegasoft-home.tsx` also owns header, menu, feature reveals, FAQ, CTA, and the hero. The single scroll measurement owner is valuable; extracting presentation sections could reduce edit coupling without splitting progress ownership. This is a maintainability observation, not a reason to refactor during Phase 16.

## Questions to consider

Which first-scroll reference frame should define the shared landing/activation inventory? Should the next pass prioritize that visual handoff or the process/keyboard semantics?
