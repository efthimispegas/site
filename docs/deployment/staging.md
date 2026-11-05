# Staging release contract

Push a `release/<name>` branch to run `.github/workflows/pegasoft-staging.yml`. `main` and `codex/*` do not deploy staging. Manual runs must also use a `release/<name>` branch. GitHub environment `pegasoft-staging` permits only `release/*` branches.

The workflow verifies the candidate with repository-pinned Node/pnpm and Nx, then deploys the dedicated Pages project’s `staging` preview branch. Staging stays in development deployment mode, excludes inspectors, emits `noindex` response headers and disallows crawling. It must never use the production Pages project.

Configure outside source:

- Repository variable `PEGASOFT_STAGING_READY`: enable only after credentials and hostname are verified.
- Environment variables: `PEGASOFT_STAGING_PAGES_PROJECT`, `PEGASOFT_STAGING_SITE_URL`, `PEGASOFT_PRODUCTION_PAGES_PROJECT` (isolation guard), `CLOUDFLARE_ACCOUNT_ID`.
- Environment secret: `CLOUDFLARE_API_TOKEN`, entered by the owner directly in GitHub. Use an account-scoped Pages deployment token; no token belongs in source, logs or chat.

All release branches intentionally update one shared staging preview; the workflow serializes deployments and cancels superseded runs. Record the tested commit when reviewing. Verify live EN/EL routes, asset identity, robots headers, navigation state and affected components before accepting a checkpoint.

Staging acceptance precedes a PR to `main`. Production remains a separate protected workflow/environment. Neither a release-branch push nor staging approval authorizes a production deployment. Keep review screenshots, deployment ledgers and other evidence local.
