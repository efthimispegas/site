# Pegasoft workspace

The production website is `apps/pegasoft-concept`: bilingual Greek/English static HTML, vanilla JavaScript/CSS and Three.js, built by Vite through Nx and deployed to Cloudflare Pages. `apps/pegasoft-intake` owns the separately gated private submission backend. The Next.js applications in `apps/pegasoft` and `apps/individual`, plus shared libraries, remain in the workspace; they are not the current production website.

## Start here

- [Agent directives and efficient working rules](AGENTS.md)
- [Parallel-stream Git workflow](docs/deployment/git-workflow.md)
- [Versioned staging and production releases](docs/deployment/staging.md)
- [Shared UI layout contract](docs/design/layout-contract.md)
- [Website configuration and verification](apps/pegasoft-concept/README.md)
- [Private intake operations and activation gates](apps/pegasoft-intake/README.md)
- [Owner-controlled Gmail retention](apps/pegasoft-intake/tools/gmail-retention/README.md)
- [Dependency maintenance](docs/dependency-maintenance.md)

## Local work and verification

Select the Node version in `.nvmrc` and the pnpm version in the root package before installing with `pnpm install --frozen-lockfile`. Use the repository's Nx skills to query resolved targets; run tasks through the pinned package manager and Nx.

```sh
pnpm nx show projects
pnpm nx run @site/pegasoft-concept:dev
pnpm nx run-many --projects=@site/pegasoft-concept --targets=lint,test,build
```

Configure public site origins and local-server settings in the website's ignored `.env`, following its `.env.example`. Keep credentials server-side and in provider/GitHub secret stores. Do not commit LAN addresses, credentials or deployment-specific values. Legacy Next.js apps use their own configuration; do not apply their hosting checklist to the static website.

## Publication boundaries

Feature PRs integrate into `develop`; only versioned release branches publish shared staging. Main CI and the protected owner-review job control production. See the linked release contract before promotion. Backend activation, Careers/CV qualification, analytics, content approval, SEO and physical-device acceptance are separate gates; a successful build or a source merge does not satisfy them.

Use only verified public claims and permission-approved client material. Keep provisional work labelled and unpublished until approved. Evidence, local review pages, recordings, historic reports and recovery bundles remain local and ignored. Required runtime media remains tracked.
