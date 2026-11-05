# Pegasoft website

The maintained production application uses vanilla JavaScript, CSS and Three.js revision 182, packaged with Vite and orchestrated by Nx. Preserve approved runtime media, camera/motion ownership, components and tokens. Next.js dependencies and conventions belong to the retained applications elsewhere in the workspace.

## Configuration and commands

Use the workspace-pinned Node/pnpm versions. Copy `.env.example` into the ignored application `.env`; configure provider/CI values outside source. `PEGASOFT_PUBLIC_SITE_URL` is a clean HTTPS public origin used for generated metadata. Never put credentials in public configuration. `PEGASOFT_DEV_HOST`, `PEGASOFT_DEV_PORT` and `PEGASOFT_PREVIEW_PORT` configure local servers; use the machine's current LAN address for paired-device checks without committing it.

```sh
pnpm nx run @site/pegasoft-concept:dev
pnpm nx run @site/pegasoft-concept:build
pnpm nx run @site/pegasoft-concept:preview
pnpm nx run-many --projects=@site/pegasoft-concept --targets=lint,test
```

Output is `dist/apps/pegasoft-concept`. The build emits English and Greek home, Insights index and article routes. Editorial content can retain its own publication restrictions independently of homepage indexing. Read current source configuration and the linked GitHub items for feature status rather than treating an old README review date as approval.

## Shared components and UI

Homepage, Insights and article details reuse the approved loader renderer/preset, header, menu/language controls, closing section, footer and cookie controls. Do not recreate page-specific approximations. Read [the layout contract](../../docs/design/layout-contract.md) and use Taste alongside Impeccable for UI work. Preserve locale, light/dark, keyboard, reduced-motion and shared lifecycle behavior. Rendered checks and actual device coverage must be reported separately from source/build checks.

## Source and runtime verification

`production-inputs.json` pins maintained inputs. Build gates check source/asset bytes, imports, required chapters, Three.js, loader settings and reversible chapter-clock mapping. Relevant tests cover motion, lifecycle, localization and counters. Inspect intentional changes before running `pnpm nx run @site/pegasoft-concept:record-inputs`; never use it to conceal unexplained drift.

Required models, textures, fonts, geography and ocean video live under `public/assets/`; scene modules and vendored renderer code live under `runtime/`. Keep evidence, recordings, review pages, generation artifacts and recovery bundles outside published source. Tests/builds must not depend on that historical material.

## Deployment and independent gates

Follow [the shared Git workflow](../../docs/deployment/git-workflow.md) and [versioned staging contract](../../docs/deployment/staging.md). Development/preview builds stay noindex. Approved production builds require matching configured public/production origins, production deployment mode, and inspectors excluded. These switches do not independently authorize release or editorial publication.

Website deployment uses dedicated Cloudflare Pages projects, GitHub environment configuration and protected production owner review. Do not reuse production submission storage, email credentials or CV bindings in staging. Verify deployed locales, canonical/redirect behavior, assets and form availability; use a known-good provider deployment for rollback.

Forms and private CV handling are separately qualified through the [intake runbook](../pegasoft-intake/README.md). Keep unavailable functionality honestly labelled. Contact-first activation does not authorize Careers, analytics, mail deletion or a change to retention/provider policy. Analytics and SEO have independent review gates; do not add trackers while reconciling forms or styling.

## Contact and privacy configuration

The recovered Contact adapter is disabled by default. Activation requires qualified same-origin transport, Turnstile and a matching approved privacy version; the build rejects incomplete settings. Careers remains separately disabled. `tools/privacy-page.mjs` emits EN/EL review drafts under each locale’s privacy path. Drafts are noindex and cannot authorize form activation. Provider-only qualification does not replace application end-to-end or physical-device checks.
