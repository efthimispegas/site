# Pegasoft Concept application

Vanilla HTML/CSS/JavaScript, Vite and Nx, with the approved Three.js revision 182.
React/Next.js and additional animation frameworks are not required by this app.

The homepage assembles the loader/globe, outcome, lift/container/truck, highway,
ship/water, clouds/jet, Trusted testimonials, partners, editorial, CTA and footer.
Use [CURRENT](../../artifacts/pegasoft-concept/CURRENT.md) for the active review gate
and [PROPOSAL](../../artifacts/pegasoft-concept/PROPOSAL.md) for scope and constraints.
Testimonials/partners and Insights are visually approved; FAQ and Careers interactions
are approved. All bilingual copy, Insights articles and page destinations remain pending. Testimonial and partner identities remain fictional placeholders. Company facts/legal details and
submission endpoints are unconfirmed; contact forms only validate local drafts.

Run from the workspace root with the pinned Node/pnpm toolchain:

```sh
pnpm nx run @site/pegasoft-concept:dev
pnpm nx run @site/pegasoft-concept:build
pnpm nx run @site/pegasoft-concept:preview
pnpm nx run-many --targets=build,lint,test --projects=@site/pegasoft-concept
```

Development: `http://127.0.0.1:8770/`.
Production-build review: `http://127.0.0.1:8771/`.
Build output: `dist/apps/pegasoft-concept`.
Vite preview is a local review server, not production hosting.

Diagnostic entry points share the production controllers and assets:

- `/review/ship-jet-integration.html#viewer`
- `/review/loader.html#viewer`
- `/review/footer-particles.html#viewer`

`src/journey-host.js` owns scrolling and the single application frame scheduler.
Chapter controllers expose mount, update, resize, tick/render and dispose operations.
Opening/globe time, scroll progress, media time and pointer effects remain separate
inputs. The content controller owns native navigation, dialogs and local form drafts.
Graphics preparation yields in bounded batches; model downloads prefetch during
the opening and later scene preparation runs while hero/outcomes are readable.
A 20-second initialization deadline selects readable fallback content if a resource hangs. Offscreen scenes
stop rendering and scroll input is coalesced into the existing frame scheduler.
The partner wall receives frame time from the existing scheduler; its stationary
column hit surfaces retain hover through gaps and raised artwork edges.

Build checks the baseline, homepage and commissioned-amendment manifests before
bundling. Runtime assets, licenses and source snapshots preserve their bytes;
`.gitattributes` prevents line-ending normalization from invalidating those hashes.
Do not regenerate frozen packaging inputs over later controller or content work.
Historical evidence is outside the production bundle and retains its own source
commit, configuration and acceptance limits. Earlier packaging comparison tasks
may intentionally reject later commissioned changes; use the evidence packet for
the relevant review stage rather than treating historical checks as current gates.

Build/lint/tests establish technical checks, not visual acceptance or deployment.
Whole-site qualification and release remain separate gates. Preserve the approved
object geometry, camera/motion behavior, cloud/shadow presets and recorded fixed
lift-grabber pickup limitation unless the user authorizes a specific change.

## Mobile startup regression

The opening owns its clock and releases scrolling when the aperture is fully open. Model bytes prefetch during it; later CPU/GPU preparation runs while hero/outcomes are readable. Fast scrolling waits at an unfinished chapter, without exposing warmup poses. Ocean decode/autoplay is optional for initialization, with frame0 of the approved clip as fallback. Native gzip decoding uses opaque `.gz.bin` assets because some static servers/tunnels automatically decode `.gz`; older browsers fall back to original GLBs. Build minification and sidecars preserve approved asset data. See [the current evidence packet](../../artifacts/pegasoft-concept/evidence/mobile-startup/20261019/review.json). Production hosting must serve the generated sidecars; this is verified on the current preview.

## Localization review

Greek (`el`) and English (`en`) are the only supported languages; Greek is the launch default. `/el/` and `/en/` load directly, while the root respects a saved selection. A language dropdown sits after the Let’s talk CTA, showing only the selected country flag (Greece / United Kingdom). Its language options open directly below the trigger. The same flag control follows the CTA on narrow screens. `src/locales/el.js` holds draft translations keyed by stable English source messages; `data-msg` disambiguates context-specific copy. Existing DOM nodes, model ownership, motion equations and clocks stay mounted when switching. User inputs and CV files remain local and are never translated. Static localized homepages and share metadata/artwork are emitted during the Vite build. Inspection pages remain English.

Review Greek copy and both responsive layouts independently before acceptance. About, Contact, Insights, Careers and Let’s talk will navigate to separate pages; URLs and final navigation remain deferred. The current in-page prototype actions are not final navigation. The current bilingual preview is prepared for the user-authorized Cloudflare update; see the deployment receipt in CURRENT. Whole-site SEO qualification remains a separate review after site review.

The language menu and overall localized presentation look good by user review on 19 October. All section copy in Greek and English remains pending section-by-section review;visual or interaction acceptance does not approve wording,figures or company claims. Greek ship-heading fit is verified separately from copy approval.
