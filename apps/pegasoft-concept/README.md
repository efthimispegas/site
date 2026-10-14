# Pegasoft Concept application

Vanilla HTML/CSS/JavaScript, Vite and Nx, with the approved Three.js revision 182.
React/Next.js and additional animation frameworks are not required by this app.

The homepage assembles the loader/globe, outcome, lift/container/truck, highway,
ship/water, clouds/jet, Trusted testimonials, partners, editorial, CTA and footer.
Use [CURRENT](../../artifacts/pegasoft-concept/CURRENT.md) for the active review gate
and [PROPOSAL](../../artifacts/pegasoft-concept/PROPOSAL.md) for scope and constraints.
The newer content layouts remain pending personal visual acceptance. Testimonial
and partner identities are fictional placeholders. Company facts/legal details and
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
