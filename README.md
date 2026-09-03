# Pegasoft Site Monorepo

Nx monorepo for two Next.js apps:

- `apps/pegasoft`: Pegasoft company site for design and delivery quality digital product solutions.
- `apps/individual`: provisional individual/freelancer brand site using an invented v1 persona.

## Product Rules

- Concept work is stored as `ConceptLabStudy` and must stay clearly labeled as `Concept Lab`.
- Real client/product work is stored as `ClientProductProject` and only publishes when `permissionStatus` is `approved`.
- The individual app persona is provisional. Replace all identity, work, and credentials before public launch.

## Local Development

The workspace is pinned to Node 24.19.0 and pnpm 10.8.1. With nvm and
Corepack installed, activate the repository toolchain before installing:

```sh
nvm install
nvm use
corepack enable
pnpm install
pnpm dev:pegasoft
pnpm dev:individual
```

Pegasoft runs on the default Next dev port when launched directly. E2E tests run Pegasoft on `4200` and the individual app on `4300`.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm e2e
```

The E2E suite includes CTA checks, taxonomy checks, mobile overflow checks, and axe scans for serious/critical accessibility violations.

## Environment

Copy `.env.example` for local values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BOOKING_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_ANALYTICS_DOMAIN`

## Deployment

Use Vercel + GitHub as the first production target. Create separate Vercel projects for each app and set the project root to `apps/pegasoft` or `apps/individual`. Keep preview deployments enabled and use Vercel rollback for production recovery.
