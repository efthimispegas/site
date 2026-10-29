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
