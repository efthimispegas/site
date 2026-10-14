# Implementation Plan — Vanilla JavaScript, Vite and Nx

Adopted by direct implementation request on 12 October 2026. Use `PROPOSAL.md` as the website authority and `CURRENT.md` as the active execution checkpoint. This plan replaces the historical Next.js migration proposal.

## Direction and boundaries

Build `apps/pegasoft-concept` with HTML, CSS, modular JavaScript and the accepted Three.js rendering. Use Vite for development/static builds and Nx for tasks. React, Next.js, TypeScript and Fiber are not requirements. Preserve their dependencies for unrelated applications.

Separate packaging, controller refactoring and website assembly. From the first verified slice onward, expose migrated behavior at the application root with native scrolling and no inspection controls. Refresh this website view after every migration/refactoring step. Keep the inspector as a secondary diagnostic entry; it must not be the only visible deliverable. Preserve the approved reviews as frozen comparisons. Change no asset bytes, geometry, materials, lighting, shaders, camera paths, motion equations or accepted CSS appearance during packaging. Generate no replacement assets; add no animation framework. Do not deploy.

Use the pinned workspace Node/pnpm configuration. Validate the Nx graph before configuration. Keep the approved vendored Three.js revision 182 and resolve all named/direct imports to that same implementation. Renderer replacement, canvas consolidation, asset optimization and dependency upgrades are separate verified changes.

Copy only runtime-required assets into the application public directory; retain source hashes and licenses, centralize asset URLs and verify production fetch/load paths. Keep historical evidence and recordings outside the bundle. The pilot inspection links to those materials in the original local review; these links are not final production destinations.

## Module and runtime ownership

- Use feature modules for graphics, story coordination and UI/content. Extract shared Nx libraries when a second production consumer demonstrates reuse.
- Controllers expose `mount`, `update`, `resize` and `dispose`. Supply explicit elements/assets. Update inputs contain local chapter progress, elapsed time, viewport and reduced motion. Use JSDoc; require no wholesale TypeScript conversion.
- One story coordinator maps page scroll to local progress; one frame scheduler invokes active controllers. Each camera and attachment has one owner. Keep timed opening/globe, scrolling and pointer clocks distinct. Preserve local equations and unequal chapter durations.
- Preserve the existing canvas/layer composition first. Initialize upcoming resources before transitions and maintain transforms/attachment ownership through overlaps.
- Refactor simulated UI state and global selectors only after the packaged review matches its source. Separate inspection controls from production behavior; both entry points use the same modules/controllers.
- Keep semantic headings, descriptions and navigation in HTML. Extract shared tokens/typography and scope CSS without redesigning accepted scenes.

## Execution order and personal-review gates

| Step | Work | Gate |
|---|---|---|
| 1 | Freeze approved source closure, assets, presets, approval links and known limitations. | All migrated inputs have verified comparison sources. |
| 2 | Package the latest accepted ship/cloud/jet review through Vite/Nx. Change only build integration and necessary import/asset/reference addresses. | Development and production reproduce the review. Expose the verified slice at the website root; retain the inspector for comparison. |
| 3 | Extract loading, controls, scene ownership and lifecycle incrementally. | Each extraction preserves accepted appearance, timing and forward/reverse behavior in both the website root and inspector. Deliver a visible localhost website checkpoint. |
| 4 | Extend the existing website root in real homepage order: stack pickup → reverse → truck → highway → ship/water → clouds/jet. | Verify every neighboring boundary before continuing. |
| 5 | Port the accepted opening and correct rejected outcome parallax/counters in the homepage. | Opening parity, reopened loader review and personal approval of the connected outcome. |
| 6 | Finish editorial entrance/hover, CTA rings/cursor and footer effects in-app. | Personal review in actual neighboring sections. |
| 7 | Finish testimonials/partners, copy, FAQ, navigation, contact and cookies. | Confirm facts, destinations, endpoint/consent behavior; content approval remains last. |
| 8 | Qualify responsive production journey from opening through footer. | Whole-site acceptance before separately authorized release. |

Unchanged assets retain approval. Separate asset identity, motion approval, migration verification and website acceptance. Identify intended deviations first; review affected behaviors and neighbors.

Preserve the fixed grabber dimensions and documented unresolved four-corner pickup limitation. The rejected isolated outcome draft stays frozen. Its homepage correction is accepted at the 14 October step-5 gate: 10–27% horizon, outcome near 26%, once-only bouncing counters and the exact supplied loader preset. Step 6 and all current homepage amendments are user accepted on 14 October; [the approval and frozen input](evidence/website-motion/20261014/all-amendments-approved/user-approval.json) preserve that state. Continue with step 7 ordinary content/layout/interaction review. Company facts, contact fields/endpoint and legal details require confirmation; step 8 whole-site acceptance remains separate.

## Checks and stopping conditions

- Packaging: baseline hashes, single Three.js implementation, asset/font/media loads, licenses, source syntax and production URLs. Compare before architectural changes.
- Fidelity: matched viewport/progress captures, normal/reverse playback and critical boundaries. Protect camera stability, attachments/articulation, uniform ocean treatment, cloud presets and trailing-wing reveal/shadow.
- Integration: genuine forward/reverse scrolling, resize without progress jumps, loading failures, initialization/disposal/remount, visibility changes and reduced motion. Inspect keyboard/touch and semantic content. Retain static approved fallback assets.
- Run proportional lint/tests/build through Nx. Test progression, attachment and lifecycle contracts. Technical checks never establish personal visual acceptance.
- Associate evidence with source/configuration/build hashes and run conditions. Inspect responsive whole-site layout, destinations, confirmed form/consent and measured loading/rendering performance before final acceptance.

Default to static marketing-site delivery. Confirm submission backend, content/legal requirements and extra page destinations when needed; do not invent them. Use pilot findings to estimate remaining work. Stop at personal-review gates, without deployment, paid generation or unrelated changes.
