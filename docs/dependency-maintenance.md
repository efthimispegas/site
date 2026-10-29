# Dependency maintenance

Use the pinned Node and pnpm versions, install with the frozen lockfile, and run
workspace tasks through Nx. The concept website remains a static Vite application
with its approved vendored Three.js renderer. The retained Next.js applications
have separate framework dependencies.

## Version alignment

- Keep Nx and the directly declared `@nx/*` packages on the same release.
- Keep Next.js, its ESLint plugin/config, and both older applications' Next.js
  declarations aligned. Retain the framework-generated `next-env.d.ts` references
  emitted by that release.
- Keep Vitest and its coverage package aligned.
- Set `NODE_ENV=production` for build targets only. Applying it globally to tests
  changes React testing behavior.

## Transitive fixes

The root `pnpm.overrides` entries replace specific vulnerable versions rather than
forcing every version of a package to the newest major. The lockfile records the
resolved packages. No advisory is ignored and the CI audit threshold is unchanged.

Several parent packages pin exact dependencies, including Nx's Axios,
brace-expansion, follow-redirects and smol-toml dependencies, and Module
Federation's Undici dependency. Those pins require explicit overrides even where
the replacement stays in the same major version.

The one compatibility-line exception is scoped to
`@module-federation/dts-plugin@2.5.1>adm-zip`: its pinned `0.5.10` is replaced with
`0.6.1`. Verify the public `generateTypes` path creates the same declaration
archive, and that it can be read and extracted, when revisiting this exception.
Do not apply this override to unrelated archive consumers.

When upgrading a parent, remove overrides it no longer needs, regenerate the
lockfile, run the audit and relevant Nx checks, and compare the approved website
without changing its renderer, motion, assets or content at the same time.

## Remaining advisories

The 29 October 2026 root-workspace audit retains two findings. They remain visible
in the audit; passing the existing high-severity threshold is not a clean audit.

| Dependency                                         | Finding                                                                                         | Current boundary and follow-up                                                                                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uuid@8.3.2` through `webpack-dev-server > sockjs` | [Moderate: output-buffer bounds in v3/v5/v6](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | The installed SockJS uses `v4()` without an output buffer. Its latest published release still requests UUID 8. Track an upstream parent update; do not silently force UUID 11 across its declared major. |
| `deepmerge@4.3.1` through Rollup's Node resolver   | [Low: returned-object prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)   | No patched release is published. The inspected resolver call merges its built-in defaults. Track an upstream fix or a separately tested replacement.                                                     |

These observations describe the inspected call sites, not a waiver or a claim
that every possible toolchain use is safe. Recheck the advisory feed during
release verification. The independent Cloudflare tooling lockfile, provider
configuration, browser/device qualification and launch-content approval require
their own checks.

Verification recordings, screenshots, diagnostic fixtures, private configuration
and raw audit packets remain local and ignored. They are not production assets.
