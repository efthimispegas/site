# Nx/Vitest project-graph runtime handoff

Status: resolved independently from the hero refactor on 2026-09-02

Observed: 2026-09-02

## Problem

Nx project-graph creation can fail after its cached graph is invalidated when
the workspace command is launched by the current shell's Node `20.15.0`.
This prevents otherwise unrelated Nx targets from starting and can look
intermittent while a previously computed graph remains cached.

At diagnosis time, the workspace required Node
`^20.19.0 || ^22.13.0 || >=24.0.0`. The failing shell runtime was therefore
below the declared minimum.

## Reproduction

From the repository root, with Node `20.15.0` and pnpm `10.8.1`:

```sh
pnpm nx run-many -t lint typecheck -p @site/pegasoft @site/pegasoft-e2e --verbose
```

Nx `22.7.5` fails while processing `apps/pegasoft/vitest.config.mts` through
the `@nx/vitest` plugin. The relevant error is:

```text
Error [ERR_REQUIRE_ESM]: require() of ES Module .../vitest/dist/node.js
from .../@nx/vitest/src/plugins/plugin.js not supported
```

Relevant installed constraints:

- `nx`: `22.7.5`
- `@nx/vitest`: `22.7.5`
- `vitest`: `~4.1.0` (installed `4.1.8`)
- repository Node engine at diagnosis: `^20.19.0 || ^22.13.0 || >=24.0.0`
- no `.nvmrc`, `.node-version`, `.tool-versions`, Volta declaration, or
  `packageManager` field pinned the local toolchain at diagnosis

## Cause boundary already verified

No dependency or Nx configuration change is required to make the same graph
and targets run under Node `24.19.0`. Launching the workspace-local Nx CLI with
that runtime successfully completed Pegasoft and Pegasoft E2E lint/typecheck,
and the atomized hero-contract Vitest target passed all 12 tests.

This proves the immediate failure is the unsupported launch runtime, not the
hero field-evidence changes. Do not downgrade Vitest or alter the hero harness
as the first response.

The successful diagnostic invocation used pnpm `10.8.1` while explicitly
launching the workspace Nx CLI with Node `24.19.0`:

```sh
/path/to/node-24 /path/to/pnpm exec /path/to/node-24 \
  node_modules/nx/dist/bin/nx.js run-many \
  -t lint typecheck -p @site/pegasoft @site/pegasoft-e2e
```

Using a different major pnpm binary against the existing `node_modules` is not
a valid workaround: bundled pnpm `11.19.0` attempted to purge/reinstall the
pnpm-10-created modules directory.

## Implemented resolution

- `.nvmrc` pins local development to Node `24.19.0`.
- `package.json` supports the Node 24 line from `24.19.0` and pins pnpm
  `10.8.1` through both `packageManager` and `engines`.
- CI reads the Node version from `.nvmrc` and the pnpm version from
  `packageManager`, removing duplicated runtime declarations.
- The README documents activating the pinned toolchain with nvm and Corepack.
- No Nx, Vitest, or hero implementation dependency was changed.

## Acceptance checks

```sh
node --version
pnpm --version
pnpm nx show project @site/pegasoft --json
pnpm nx run-many -t lint typecheck -p @site/pegasoft @site/pegasoft-e2e
pnpm nx run @site/pegasoft:test-ci--src/app/shared/hero-scene/hero-contract.spec.ts
```

The Nx cache and daemon state were reset before rebuilding the project graph
under Node `24.19.0` and pnpm `10.8.1`. Project discovery, Pegasoft and
Pegasoft E2E lint/typecheck, and the 12-test hero-contract Vitest target all
completed successfully.
