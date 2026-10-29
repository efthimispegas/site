# Pegasoft Site Monorepo

Nx/pnpm workspace containing:

- `apps/pegasoft-concept`: the production Pegasoft website, built with HTML, CSS, modular JavaScript, Three.js and Vite.
- `apps/pegasoft-intake`: the separate Cloudflare Worker for private contact and Careers processing. Public processing remains disabled until operational qualification is complete.
- `apps/pegasoft`: the earlier Next.js company-site implementation, retained independently from the production website.
- `apps/individual`: the provisional Next.js individual/freelancer site. Its identity and claims require review before publication.

## Local development

Use the Node version in `.nvmrc` and the pnpm version pinned in `package.json`.
With nvm and Corepack installed:

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

For the production website, copy `apps/pegasoft-concept/.env.example` to the ignored
`.env` in that directory and configure its public origin and local server settings.
Then use the explicit Nx targets:

```sh
pnpm nx run pegasoft-concept:dev
pnpm nx run pegasoft-concept:build
pnpm nx run pegasoft-concept:preview
```

The defaults are ports 8770 for development and 8771 for build preview. Override
these using the documented app environment settings. The configured public origin
must be an HTTPS origin; it is independent from the local HTTP listening address.
Nx project inference also loads the Vite configuration, so configure the app's
public origin before running workspace tasks.

The legacy Next.js apps remain available through `pnpm dev:pegasoft` and
`pnpm dev:individual`. Their E2E tests use ports 4200 and 4300 respectively.

## Verification

```sh
pnpm nx run-many --projects=pegasoft-concept --targets=lint,test,build
pnpm nx run-many -t lint test typecheck build --parallel=3
pnpm nx run-many -t e2e --parallel=1
pnpm nx format:check
```

The website build verifies maintained production inputs. Runtime assets are under
`apps/pegasoft-concept/public/assets`; scene controllers are under `runtime/`.
Local screenshots, review pages, brand proposals and historical evidence are not
required for production builds and must not be added to release commits.

The legacy E2E suites cover their respective Next.js applications. Passing those
suites does not establish physical-device acceptance of the Vite website.

## Production deployment

The production website is statically built and deployed to a dedicated Cloudflare
Pages project by `.github/workflows/ci.yml` from `main`, after verification.
`PEGASOFT_PRODUCTION_READY` and the protected `pegasoft-production` environment gate
the upload. The environment retains required owner review. Account identifiers,
project names, canonical origin and deployment credentials are supplied through
GitHub variables/secrets, not embedded into application source.

The development Pages project remains separate. Development builds remain excluded
from indexing; production indexing requires a matching configured production
origin. Custom-domain DNS, HTTPS and redirects are managed in Cloudflare.

The private intake has its own workflow, credentials and qualification gates.
Deploying the website does not enable submissions. See
[its implementation instructions](apps/pegasoft-intake/README.md) before changing
processing or retention settings.

Reconcile future work against current `main`. Earlier concept snapshots use old
asset paths, review entry points and superseded dependency settings; importing an
entire snapshot can undo accepted fixes. Keep unrelated local work intact and
submit only the remaining maintained-source changes through a reviewed PR.
