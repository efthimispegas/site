# Staging release contract

Parallel work follows [git-workflow.md](git-workflow.md): scoped feature branches integrate through reviewed PRs into `develop`; a release coordinator cuts the versioned candidate only when staging promotion is requested. `develop` does not deploy.

Push a `release/<major>.<minor>.<patch>` branch to run `.github/workflows/pegasoft-staging.yml`. `main` and `codex/*` do not deploy staging. Manual runs must also use a `release/<major>.<minor>.<patch>` branch. GitHub environment `pegasoft-staging` permits only `release/*` branches.

The workflow verifies the candidate with repository-pinned Node/pnpm and Nx, then deploys the dedicated Pages project’s `staging` preview branch. Staging stays in development deployment mode, excludes inspectors, emits `noindex` response headers and disallows crawling. It must never use the production Pages project.

Configure outside source:

- Repository variable `PEGASOFT_STAGING_READY`: enable only after credentials and hostname are verified.
- Environment variables: `PEGASOFT_STAGING_PAGES_PROJECT`, `PEGASOFT_STAGING_SITE_URL`, `PEGASOFT_PRODUCTION_PAGES_PROJECT` (isolation guard), `CLOUDFLARE_ACCOUNT_ID`.
- Environment secret: `CLOUDFLARE_API_TOKEN`, entered by the owner directly in GitHub. Use an account-scoped Pages deployment token; no token belongs in source, logs or chat.

All release branches intentionally update one shared staging preview; the workflow serializes deployments and cancels superseded runs. Record the tested commit when reviewing. Verify live EN/EL routes, asset identity, robots headers, navigation state and affected components before accepting a checkpoint.

Staging acceptance precedes a PR to `main`. Production remains a separate protected workflow/environment. Neither a release-branch push nor staging approval authorizes a production deployment. Keep review screenshots, deployment ledgers and other evidence local.

## Versioned promotion

The website version is owned by `apps/pegasoft-concept/package.json`, not the monorepo package version. `release/1.0.0` is the first versioned website release; earlier date-based branches are legacy history. New release names must contain exactly three numeric components with no leading zeroes and must match that package version. CI enforces both rules.

- Patch: fixes, styling/copy corrections and compatible dependency patches.
- Minor: new backwards-compatible pages or capabilities.
- Major: breaking public behavior or integration contracts.

Start each normal release from the approved `develop` commit with current production fixes integrated, increment the website version, and group changes into conventional commits. Emergency patch releases start from production `main` to exclude unrelated development work. Push the versioned branch to publish the shared staging preview. Do not open the promotion PR or merge it until the owner approves that staging revision. Changes after approval require staging CI and renewed review.

After approval, open a PR from the release branch to `main`; require its full CI to pass, then merge while preserving the contextual commits. Main reruns CI and pauses at the existing protected production approval. After owner approval and successful live verification, create an annotated `v<version>` tag on the deployed main merge commit. Tags identify completed production releases, never unreviewed staging candidates. Back-merge main into develop through a PR before deleting the completed release branch; the tag and main merge retain traceability. Select a known successful deployment for rollback and verify it again. Never reuse a published version for changed code.

The normal path is release branch → staging CI/deployment → owner review → PR/main CI → protected production approval → production verification → version tag. A version name alone does not bypass any gate.
