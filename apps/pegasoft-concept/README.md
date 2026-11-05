# Pegasoft Concept

An independent vanilla JavaScript, CSS and Three.js website, packaged with Vite and orchestrated by Nx. Keep the accepted Three.js revision182 and runtime media unchanged unless an affected visual review approves a change. React/Next.js dependencies belong to other workspace applications.

## Configuration and tasks

Use the workspace-pinned Node and pnpm versions. Copy `.env.example` to the ignored `.env` and set `PEGASOFT_PUBLIC_SITE_URL` to the intended absolute HTTPS origin before a production build. This public origin is rendered into share metadata; credentials must never be placed in client configuration. Supply it through the hosting provider's build variables as well.

`PEGASOFT_DEV_HOST`, `PEGASOFT_DEV_PORT` and `PEGASOFT_PREVIEW_PORT` configure the local servers. The example binds to all interfaces for paired-device testing; use the computer's current network address rather than committing a personal LAN address. Runtime media, models and fonts live under `public/assets/`; runtime scene modules and vendored rendering code live under `runtime/`. Local review archives are excluded from source and builds.

- `pnpm nx run @site/pegasoft-concept:dev`
- `pnpm nx run @site/pegasoft-concept:build`
- `pnpm nx run @site/pegasoft-concept:preview`
- `pnpm nx run-many -t lint,test -p @site/pegasoft-concept`

The static production output is `dist/apps/pegasoft-concept`. English and Greek homepages are emitted at build time. Contact/Careers forms are review prototypes; submitted data remains local until a separately confirmed endpoint is implemented.

## Production release configuration

Indexing stays disabled for development and preview builds, including normal Vite production builds. Set `PEGASOFT_DEPLOYMENT_ENV=production` with `PEGASOFT_PUBLIC_SITE_URL` equal to the configured `PEGASOFT_PRODUCTION_SITE_URL` only for the approved release. That build emits indexable robots metadata, removes the development `X-Robots-Tag` and allows crawling in `robots.txt`; it retains `nosniff`. Origins that differ from configured production and inspector builds cannot opt into production indexing. Development serves a noindex meta tag and excludes crawling by default.

CI verifies pull requests and `main` with development indexing. A separate deploy job runs only after verification passes for a push to `main`, and only when repository variable `PEGASOFT_PRODUCTION_READY=true`. Keep that variable unset until the approved revision, public content, private form processing and deployment checks are accepted. Configure the `pegasoft-production` GitHub environment and its reviewer protection before enabling deployment. Set `PEGASOFT_PRODUCTION_PAGES_PROJECT` to the dedicated production Pages project; the configured `PEGASOFT_DEVELOPMENT_PAGES_PROJECT` is explicitly rejected (both names are required) to preserve development. Store the account ID and scoped Pages token as environment secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The deploy job rebuilds the same verified revision with the canonical production origin, then uploads only the static output. Configure the new Pages project's production branch as `main`.

This prepares CI; it does not create the project, credentials, protection rules or DNS, merge a release into `main`, or approve launch. Verify the deployed revision and HTTP/HTTPS apex/www redirects with locale paths and query strings before marking linkage complete. Use Cloudflare's previous known-good production deployment to roll back; keep development separate.

## Fidelity and repository boundaries

`production-inputs.json` pins the maintained source and runtime assets. The three build gates verify these bytes, imports/public asset addresses, required chapters, Three.js revision, approved loader settings and reversible chapter-clock mapping. Motion, attachment, lifecycle, localization and counter tests remain in the test target. Builds and tests do not require historical screenshots, generation responses or review snapshots.

Keep `artifacts/`, historical manifests/tools, brand proposal files, recordings, audit reports and recovery bundles locally. Do not force-add ignored evidence. The runtime models, textures, fonts, geography data and ocean video in this application are legitimate website inputs; they are retained in Git. Public JSON contains the numeric runtime settings/geometry ownership only, without personal review notes or generation records.

Compare intentional rendering changes against the locally preserved approved references, then use `pnpm nx run @site/pegasoft-concept:record-inputs` to record the resulting input contract. Never use that operation to suppress unexplained drift.

## Review state

The complete brand kit is personally approved and is the sole icon/logo/symbol authority; it is distributed separately and kept in local artifacts. Its animation and website integration remain separate. The complete loader-to-hero sequence is approved with24 settings, including pulse duration0.56s and waiting-beat period2.37s. Supporting globe-speed, cookie-layout and decrypted CTA reviews are approved. Grey hero/section-title words use the existing Pegasoft accent.

Whole-site typography/layout, AI-pattern and performance audits, physical-device/Safari qualification, final bilingual copy and facts, real testimonials/Insights links, separate pages, submission endpoints/legal details and independent SEO review remain open. A source push does not imply release or deployment acceptance.

## Adaptive header review

[Header and appearance #58](https://github.com/efthimispegas/site/issues/58) owns the new reference-led navigation direction, superseding the visual direction of #42 while retaining its accessibility and overlap safeguards. The transparent hero header contracts after the hero into a centered translucent bar with 12px vertical inset; geometry changes use a 500ms transition. Navigation reuses the shared services/metrics CTA layout (44px minimum height, 12px by 20px padding, 30px radius and 600 13px/1.2 Manrope), without a separate desktop or mobile button-size override. Desktop remains available while scrolling. Mobile retains directional visibility, hero/rest differentiation, safe-area spacing and direct language switching inside the menu. The explicit light/dark preference is stored locally as `pegasoft-theme`; blocked storage falls back to a visit-only choice. Cinematic canvas/model lighting is not inverted. This implementation requires bilingual desktop/mobile design review, physical-device acceptance and protected release approval; it is not a production deployment. Source media and inspection evidence remain local.

## Insights separation — local review, 4 November 2026

PC-005's Insights slice has independent `/en/insights/` and `/el/insights/` index and article routes, reached through native locale-aware header, mobile-menu and footer links. The old landing section is removed. The implementation was recovered from `5959d179` (base `c65c9411`) into this `feature/pegasoft-concept` checkout, preserving its header and forms code. The original `/tmp/pegasoft-insights-site` checkout and its evidence are unavailable; the saved commit and PC-005 preserve provenance for the owner-supplied United Carriers reference and walkthrough.

Highlights, date sorting, category/tag filtering, article contents/progress, related articles and shared footer behavior remain available. Mobile Insights links now use the same full-size menu rows and focus styling as adjacent buttons. The autoplay button reflects initial reduced motion and pauses when that preference changes. Original copy/artwork and company LinkedIn connection remain gated under PC-003.

Local review: http://127.0.0.1:8792/en/ (compiled build); development server: port 8791. Runtime evidence: `artifacts/pegasoft-concept/insights-regression-20261104/verification.json` (ignored/local). Nx lint, 60 tests and build with three baseline dependencies pass. Chromium desktop (1440×900) and mobile emulation (390×844) verify homepage→Insights keyboard/menu/footer access, EN/EL navigation, settled sorting/filtering, article/contents, menu Escape/focus restoration, homepage footer motion and reduced-motion behavior. Screenshots were visually inspected; this is not independent or owner visual acceptance. Initial footer observations were taken before transport loading completed; the corrected final checks wait for the loaded state. Initial reduced-motion control failures and the small mobile link are retained as before-fix evidence.

Remaining: owner/independent reference and whole-site visual review, physical devices/Safari, final article/image/category approval, verified company LinkedIn destination and protected release. Other PC-005 pages remain deferred. No push, deployment or publishing.

## Staging and production promotion

`codex/pegasoft-staging-release` collects the committed header and Insights work onto current production `main`. The shared-component Insights corrections are reconciled here; private-intake changes remain a separate release. Do not merge this candidate while the Insights reuse/content/visual gates remain open. Required production assets, including favicons, are retained. Review evidence stays local and ignored.

The opt-in `pegasoft-staging.yml` workflow prepares a development build and uploads it as the `staging` preview branch of the configured non-production Pages project. It runs only for main or the named release branch and requires repository variable `PEGASOFT_STAGING_READY=true`. Before enabling it, configure a separate `pegasoft-staging` GitHub environment with restricted deployment branches, its own deployment credentials, and `PEGASOFT_STAGING_PAGES_PROJECT`, `PEGASOFT_STAGING_SITE_URL` and `PEGASOFT_PRODUCTION_PAGES_PROJECT`. Never reuse production application data, email credentials or CV bindings for staging. Staging is noindex; provider preview URLs are public unless separately protected. Review the preview access policy before uploading unpublished content.

Proposed release flow: feature PR and full CI → development preview and QA → merge approved changes into main → stage that exact main revision and run deployed smoke checks → owner-gated production release. Build production from the same verified source revision with production metadata; do not label environment-specific rebuilds byte-identical. The current production workflow has not yet been changed to require a successful staging job. Add that dependency and required main-branch PR checks before calling the staging-to-production gate enforced. Retain previous production deployment for rollback and verify actual deployed locales, navigation, assets and form availability.

Current configuration: both Pages projects use Direct Upload; GitHub owns the build. The production job is main-only and protected by owner review. Development currently has no active CI deployment environment. The new staging workflow remains disabled until explicitly configured; preparing it does not publish a candidate or authorize production release.

## Shared native-page components

Homepage, Insights index and article details share the loader renderer/preset, adaptive header, menu/language controls, closing section and complete footer. Native pages retain the approved homepage timing, responsive/reduced-motion behavior, rings, pointer/trails, marquee, particles and cookie controls. Keep shared markup sourced from the homepage rather than maintaining page-specific copies. Verify homepage/index/detail together on desktop and mobile when changing these components. Article social icons remain inactive until their destinations and behavior are approved.
