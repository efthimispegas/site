# Pegasoft Concept application

Stage: controller/lifecycle review, before full transport and homepage assembly.

The accepted cloud revision is recorded. Scene loading, a reusable controller,
inspection playback/scroll controls and lifecycle ownership are now separate modules.
The review includes a Remount scene button below the viewer.

The production controller accepts explicit `root`, `stage` and asset references.
Call `mount()` once, `update({progress,reducedMotion})` for story state,
`resize({width,height})` for the measured viewport, `tick(timestampMs)` for the
independent water clock, and `render()` from the single caller-owned frame loop.
Call `dispose()` on removal. It does not create a frame loop or ResizeObserver and
can run without inspection controls. Create a fresh controller for remounting;
the inspection adapter owns that replacement and cleans up its controls/observer.

Cloud-motion amendment: the user requested uninterrupted K01–K03 travel.
The app now follows steady-distance cloud paths and continues their clock through
the jet reveal. Appearance presets, assets and non-cloud choreography remain fixed.
The origin/veil/bank route is retained, with travel timing redistributed along its
distance. The bank position remains at the original 16-second milestone.

Run from the workspace root:

```sh
pnpm nx run @site/pegasoft-concept:dev
pnpm nx run @site/pegasoft-concept:build
pnpm nx run @site/pegasoft-concept:preview
pnpm nx run-many -p @site/pegasoft-concept -t lint test build
pnpm nx run @site/pegasoft-concept:review-check
pnpm nx run @site/pegasoft-concept:review-motion
pnpm nx run @site/pegasoft-concept:cloud-review-check
pnpm nx run @site/pegasoft-concept:controller-reference
pnpm nx run @site/pegasoft-concept:controller-review-check
pnpm nx run @site/pegasoft-concept:controller-motion
pnpm nx run @site/pegasoft-concept:controller-lifecycle
```

Development: `http://127.0.0.1:8770/`. Production-build review: `http://127.0.0.1:8771/review/ship-jet-integration.html#viewer`.

The pilot keeps the approved review layout and rendering. Its links to historical
evidence use the original local server at port 8767; those files are not bundled.
Browser comparison checks require that server, both Vite servers and installed Google Chrome.
Vite preview is a local inspection server, not the production hosting service.

`baseline-manifest.json` records the input closure, byte hashes and allowed packaging
transformations. Build verifies it before bundling. `runtime-amendments.json` pins
the three user-requested cloud amendments and added motion module separately;
all other inputs still require their original hashes. The checked-in runtime assets are
byte-identical copies. The vendor license and used font licenses are retained.

`controller-refactor-manifest.json` pins the accepted cloud revision and the exact
controller extraction inputs/outputs. Rendered parity is checked against the frozen
accepted build at port 8772. That server verifies hashes and reuses frozen runtime
assets; reference builds and recordings are not included in the app bundle.

`tools/package-reviewed-slice.mjs` initially packages the input closure. An explicit
`--refresh-packaging` verifies frozen source hashes before refreshing derivatives;
never use it to overwrite future controller work. It now refuses regeneration
while runtime amendments exist. The baseline verifier is a
packaging-stage contract and must be replaced with corresponding parity checks
when controller refactoring is authorized.

The shared stylesheet is embedded at its original position because Vite's CSS
extraction otherwise changes the accepted cascade. Renderer settings, Three.js
revision 182, motion equations, presets, asset bytes and CSS declarations remain
unchanged except the explicitly requested cloud-position travel. No React/Next.js
code or new animation framework is required. `review-check` records the original
packaging parity and is expected to reject the intentional cloud-position changes;
use `cloud-review-check` for the amended trajectory and unaffected-field comparison.

Initialization, cancellation, disposal/remount and isolated frame ownership are
checked at this gate. Full transport coordination and website acceptance remain
pending; no vehicle rig geometry or approved motion has been redesigned.
