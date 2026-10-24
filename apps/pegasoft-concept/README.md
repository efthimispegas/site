# Pegasoft Concept

An independent vanilla JavaScript, CSS and Three.js website, packaged with Vite and orchestrated by Nx. Keep the accepted Three.js revision182 and runtime media unchanged unless an affected visual review approves a change. React/Next.js dependencies belong to other workspace applications.

## Configuration and tasks

Use the workspace-pinned Node and pnpm versions. Copy `.env.example` to the ignored `.env` and set `PEGASOFT_PUBLIC_SITE_URL` to the intended absolute HTTPS origin before a production build. This public origin is rendered into share metadata; credentials must never be placed in client configuration. Supply it through the hosting provider's build variables as well.

`PEGASOFT_DEV_HOST`, `PEGASOFT_DEV_PORT` and `PEGASOFT_PREVIEW_PORT` configure the local servers. The example binds to all interfaces for paired-device testing; use the computer's current network address rather than committing a personal LAN address. `PEGASOFT_INCLUDE_INSPECTORS=true` optionally adds developer inspection pages to a build; production omits them by default. Local Vite development can still serve `/review/loader.html` and the other retained inspection tools.

- `pnpm nx run @site/pegasoft-concept:dev`
- `pnpm nx run @site/pegasoft-concept:build`
- `pnpm nx run @site/pegasoft-concept:preview`
- `pnpm nx run-many -t lint,test -p @site/pegasoft-concept`

The static production output is `dist/apps/pegasoft-concept`. English and Greek homepages are emitted at build time. Contact/Careers forms are review prototypes; submitted data remains local until a separately confirmed endpoint is implemented.

## Fidelity and repository boundaries

`production-inputs.json` pins the maintained source and runtime assets. The three build gates verify these bytes, imports/public asset addresses, required chapters, Three.js revision, approved loader settings and reversible chapter-clock mapping. Motion, attachment, lifecycle, localization and counter tests remain in the test target. Builds and tests do not require historical screenshots, generation responses or review snapshots.

Keep `artifacts/`, historical manifests/tools, brand proposal files, recordings, audit reports and recovery bundles locally. Do not force-add ignored evidence. The runtime models, textures, fonts, geography data and ocean video in this application are legitimate website inputs; they are retained in Git. Public JSON contains the numeric runtime settings/geometry ownership only, without personal review notes or generation records.

Compare intentional rendering changes against the locally preserved approved references, then use `pnpm nx run @site/pegasoft-concept:record-inputs` to record the resulting input contract. Never use that operation to suppress unexplained drift.

## Review state

The complete brand kit is personally approved and is the sole icon/logo/symbol authority; it is distributed separately and kept in local artifacts. Its animation and website integration remain separate. The complete loader-to-hero sequence is approved with24 settings, including pulse duration0.56s and waiting-beat period2.37s. Supporting globe-speed, cookie-layout and decrypted CTA reviews are approved. Grey hero/section-title words use the existing Pegasoft accent.

Whole-site typography/layout, AI-pattern and performance audits, physical-device/Safari qualification, final bilingual copy and facts, real testimonials/Insights links, separate pages, submission endpoints/legal details and independent SEO review remain open. A source push does not imply release or deployment acceptance.
