# Proposal: move remaining work into the Nx/React website

Status: superseded historical proposal. Date: 12 October 2026. Branch: `codex/pegasoft-concept`.

The user adopted the [vanilla JavaScript / Vite / Nx implementation plan](IMPLEMENTATION-DIRECTION-PLAN.md). The Next.js recommendation, execution order and library choices below are historical discussion, not active instructions. Use PROPOSAL.md and CURRENT.md for execution.

The existing plan and user pause remain in force. This document proposes replacing the remaining standalone-review-first sequence with early application scaffolding, incremental migration and acceptance in the actual website.

## Recommendation

Create the production application structure now, then complete all remaining sections through that structure. Retain standalone reviews as frozen references and diagnostics. Review the real connected homepage as each segment becomes usable. Any chapter inspector must render the same production component, assets and motion controller as the homepage.

The HTML review hosts and direct DOM bindings need refactoring. Approved media/models, geometry, material recipes, numeric presets and much of the pure Three.js/trajectory code can be reused. Avoid wholesale scene rewrites merely to make every object declarative React.

## Preserve the approvals as acceptance criteria

- **Asset identity:** retain approved GLB/PNG/video/font bytes, provenance, material roles and dimensions.
- **Motion behavior:** retain approved attachment/transfer relationships, timing beats, camera paths, stable framing, fixed grabber dimensions and exact control presets. Keep elapsed opening/globe time, scroll-driven story motion and pointer response separate.
- **Migration verification:** compare the React implementation with the committed approved source and its matched viewport/landmark captures. Passing this gate establishes port fidelity; it does not constitute final website acceptance.
- **Website acceptance:** review assembled spacing, pacing, boundaries, navigation, content and responsive behavior in the production app. Prior approval of an asset or isolated section does not automatically approve this assembled result.

Identify any intended change to an approved behavior before applying it. Re-review the affected behavior and adjoining boundaries instead of reopening unchanged asset families.

## Proposed sequence and gates

| Step | Work | Completion gate |
|---|---|---|
| 1. Freeze the migration baseline | Use the five approved feature commits and documentation checkpoint. Map assets, source owners, presets and known limitations. Preserve rejected outcome work as a local reference only. | Each approved input has an owner and a reproducible comparison reference. |
| 2. Scaffold the real app | Prepare the worktree dependencies; use Nx generators for `apps/pegasoft-concept` with React/TypeScript. Prefer the repository's configured Next.js stack. Establish routes, design tokens, section containers, asset loading and targeted checks. | App runs and builds through Nx; homepage contains the actual section order with clearly marked unfinished slots. |
| 3. Prove one connected vertical slice | Port the accepted opening into the app. Implement the rejected hero/outcome parallax and requested rolling counters directly as production React components. Use the requested shorter horizon and approximately 34% content entry as requirements, not approved results. | Opening parity is verified; user reviews the hero/outcome transition in the real homepage. |
| 4. Migrate the approved transport journey | Port lift/container → truck/services → highway → ship/water → clouds/jet together incrementally. Reuse the accepted C01 identity and transforms. Preload required next-scene assets and coordinate adjoining scenes during overlaps. | Each segment preserves approved behavior; each join works under genuine forward/reverse scrolling before further migration. |
| 5. Finish remaining animated features in-app | Implement editorial entrance/hover imagery, closing CTA rings/cursor and footer particle behavior using the production components and shared systems. | User reviews them in their real website context; no separate replacement HTML implementation follows. |
| 6. Finish content and ordinary UI | Complete trust/partners, editorial copy, FAQ, navigation, contact and cookie flows. Use supplied facts and confirmed form behavior. Layout primitives can exist earlier; final content approval remains last as requested. | Content inventory is approved or explicitly omitted; destinations and form/consent behavior work. |
| 7. Qualify the complete website | Check the production build, real scrolling, responsive layouts, keyboard/touch access, reduced motion, loading and measured performance. Review the whole journey from opening through footer. | Final website acceptance, followed by separately authorized release. |

Do not require every unchanged asset to repeat static/model approval. Require visual confirmation of its React rendering and migrated motion where the host could change the result.

## Initial ownership and module structure

Start with three cohesive shared libraries rather than a library for every section or an oversized generic animation framework. Keep website-specific chapter composition in the app.

| Owner | Responsibility |
|---|---|
| `apps/pegasoft-concept` | Home/contact routes, section order, content configuration, chapter composition and app-level review controls. |
| Graphics library | Model/media loading, scene adapters, materials, lighting, camera contracts and resource cleanup. |
| Story library | Pure phase/trajectory functions, chapter progress mapping, handoff state, viewport contracts and instrumentation. |
| UI library | Tokens, typography, buttons/navigation, content blocks, rolling counters, accordions, forms and consent primitives. |

Use typed public APIs and Nx dependency boundaries. UI must not own vehicle/camera physics; shared libraries must not depend on app routes. Keep the review wrapper outside production behavior. [Nx boundary guidance](https://nx.dev/docs/features/enforce-module-boundaries).

React owns component structure and lifecycle. One controller owns each scene's updates and camera. Three.js or React Three Fiber performs continuous frame updates through refs/render-loop state. Mount/unmount must clean up animation callbacks, listeners, observers and GPU resources. [React effect lifecycle](https://react.dev/learn/synchronizing-with-effects), [React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/next/advanced/pitfalls).

Choose between an imperative Three.js adapter and declarative Fiber scene during the pilot. Preserve an accepted renderer first where rewriting it would add fidelity risk; adopt Fiber where it materially improves scene ownership and reuse. Do not run competing render loops or update the entire React tree on every animation frame.

## Boundaries to protect during migration

- Loader completion → first usable hero → scroll exit: preserve approved opening values; prevent duplicate initialization or scroll activation from disrupting the opening.
- Stack pickup → reverse → truck entry → container seating/release: preserve rigid attachments, wheel travel and accepted camera stability.
- Truck departure → overhead → road turn: preserve the approved ordering and pace without refitting zoom from moving bounds.
- Road → ship seat → water pullback: preserve C01 world pose, support and uniform water treatment.
- Ship → clouds → jet → next chapter: preserve camera continuity, cloud presets, overlap, trailing-flap reveal and shadow receiver.
- Remaining sections → CTA/footer/contact: verify actual layout height and lifecycle together, including pointer, touch and reduced-motion alternatives.

The approved fixed grabber's four-corner pickup connection remains an existing recorded technical limitation. Migration must not silently alter its approved dimensions or claim that limitation resolved.

## Effort and review implications

Scaffolding and shared ownership happen before further visual polishing. Migration proceeds one connected segment at a time, avoiding a large final merge of independent implementations. Reusable primitives are extracted when the first real segment demonstrates their requirements. Content components are implemented once in the app.

This should reduce duplicate HTML-to-React work and reveal integration problems earlier. It is not a claim that migration is free or that framework changes preserve rendering automatically. The first vertical slice supplies evidence for estimating the remaining port effort; no unsupported overall completion percentage or delivery date is assigned.

## Verified preparation state

- Approved work is committed in `25a964d6`, `411974aa`, `b8668f12`, `6efbb11d` and `ed394434`; documentation checkpoint is `295e6d63`. No push was made.
- The rejected hero/outcome source and deferred trust/partners draft remain uncommitted.
- `apps/pegasoft-concept` does not yet exist. The worktree manifests declare pnpm 10.8.1, Node 24.19.0, Nx 23.2.0, React/Next.js and Three/Fiber dependencies.
- The workspace query reported missing installed Nx modules in this worktree. Dependency installation and graph validation are preparation steps, not completed prerequisites.
- No app has been scaffolded, no runtime dependency has been installed and the canonical plan has not been reordered by this proposal.

**Proposed next item:** approve this direction, then prepare/scaffold the app and implement the opening-to-outcome pilot. On adoption, update PROPOSAL.md, CURRENT.md and HANDOFF.md to make this the single live execution order.
