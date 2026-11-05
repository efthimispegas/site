# Pegasoft parallel-stream Git workflow

This is the shared contract for every existing and future Pegasoft chat. Read it before editing, committing, pushing, opening a PR or promoting a release. The staging contract in [staging.md](staging.md) remains authoritative for versions and deployment gates.

## Branches and promotion

| Branch                            | Purpose                                                       | PR destination                                                          | Deployment                                                                 |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `main`                            | Verified production history                                   | `develop`, for release back-merges                                      | Protected production job after main CI and owner approval                  |
| `develop`                         | Reviewed, integrated work for the next release                | Cut a versioned release from an approved commit                         | CI only; never production or shared staging                                |
| `feature/pegasoft-<scope>`        | One bounded parallel stream                                   | `develop`; a release branch only for an explicitly assigned release fix | CI only                                                                    |
| `release/<major>.<minor>.<patch>` | Frozen release candidate matching the website package version | `main` after staging approval                                           | Shared staging on push; production only after merge, CI and owner approval |
| `dependabot/*`                    | Automated dependency updates                                  | `develop`                                                               | CI only                                                                    |

Normal flow: `feature/pegasoft-*` → reviewed PR → `develop` → `release/<version>` → staging review → PR to `main` → protected production approval → live verification → annotated `v<version>` tag → back-merge `main` into `develop`.

Do not use date-based release names, `codex/*`, `master`, generic concept branches or a second permanent integration branch. All human work branches, including fixes, use the requested feature prefix. A hotfix starts from current production `main`, uses `feature/pegasoft-hotfix-<scope>`, and is integrated into a new patch release; back-merge the verified result into `develop` so parallel work retains the fix. Never merge all of `develop` into a production hotfix.

## Parallel ownership

1. Fetch and inspect the actual branch, status, worktree and upstream. A chat's displayed branch indicator is not Git evidence. Reuse a suitable checkout; use an isolated worktree if another stream owns it. Never switch a shared checkout under another active writer.
2. Start new work from current `origin/develop`, or production `origin/main` for an explicit hotfix. Claim a bounded scope in the GitHub issue/PR. Check for an existing owner before duplicating work.
3. One writer owns a branch/worktree. Coordinate shared header, loader, tokens, localization, input manifest and CI changes; serialize overlapping edits. A branch name does not grant ownership of all shared files.
4. Preserve unrelated WIP. Commit only the stream's authored changes in contextual conventional commits. Do not commit evidence, screenshots, review pages, historical ledgers, private data or credentials. Required runtime assets remain tracked; configuration values belong in environment configuration and secret stores.
5. Push the feature branch with an explicit upstream. Open a PR to `develop` when implementation and applicable checks are ready, or when the user requests release/staging promotion. Use a draft only for an intentionally requested early review. Do not open empty PRs for reserved streams.
6. A ready PR states its issue, scope, checks, device/rendered coverage and remaining gates. UI work uses Taste alongside Impeccable and preserves approved components/tokens. Build success does not imply visual, content, physical-device or provider approval.
7. Merge into `develop` only after CI and the relevant acceptance gate. Preserve conventional commits with a merge commit. Do not force-push shared/reviewed history; integrate upstream with a merge. Rebase only private, unpublished commits. If an exceptional rewrite is authorized, use an exact expected old SHA with `--force-with-lease`, never plain force.

## Release coordination

- The release coordinator selects the approved `develop` commit, increments `apps/pegasoft-concept/package.json`, records the input manifest when necessary, and creates `release/<version>`. Creating/pushing it promotes to shared staging; do so only when staging promotion is requested.
- Freeze scope on the release branch. New features remain on `develop`. Release fixes need an explicitly assigned feature branch and PR into that release; retain them through the production-to-develop back-merge.
- Every change after staging approval invalidates that approval and requires a new staging deployment and review. Feature approval, staging acceptance and GitHub's required production owner review are separate gates.
- After successful production verification, tag the deployed main commit. Back-merge `main` into `develop` through a PR, preserving any newer integrated work. Never reset `develop` to `main`.
- Delete merged feature branches after ownership is released. Delete a completed release branch only after its production tag and successful back-merge exist. The immutable tag and main merge retain release traceability. Never reuse a published version.
- Unmerged branches or dirty worktrees are not stale merely because they are old. Preserve their refs, patches and untracked files locally before retiring obsolete names. Recovery snapshots are local-only and must not be pushed. A legacy detached worktree is recovery-only: port the necessary changes selectively into the assigned clean feature stream, check against current develop, and never merge its entire historical branch.

## Current stream allocation

Reserved branches start at the verified baseline; their existence does not claim implementation or approval. Existing local WIP must be reconciled before it is committed or a PR is marked ready.

| Stream               | Branch                         | Scope / related items                                                                     |
| -------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Workflow and CI      | `feature/pegasoft-gitflow`     | Shared Git contract, branch checks and promotion routing                                  |
| Insights application | `feature/pegasoft-insights`    | Article/index code, editorial approval filtering and citation rendering                   |
| Content and SEO      | `feature/pegasoft-content-seo` | Approved copy, research/publication workflow, search visibility; no automatic publishing  |
| Booking              | `feature/pegasoft-booking`     | #59, Cal.com qualification and routing                                                    |
| Private submissions  | `feature/pegasoft-intake`      | Contact-first activation, private Careers processing and provider qualification           |
| Mail retention       | `feature/pegasoft-retention`   | Owner-controlled 30-day mail retention and deletion approval gates                        |
| Runtime assets       | `feature/pegasoft-assets`      | #40, #48, logo integration and runtime-only asset organization                            |
| UI/UX                | `feature/pegasoft-ui-ux`       | #25–30, #32, layout/typography/accessibility; coordinate #27 with performance             |
| Performance          | `feature/pegasoft-performance` | #31, measured graphics/runtime optimization and physical-device qualification             |
| Analytics            | `feature/pegasoft-analytics`   | #57, consent/privacy/provider gates before collection                                     |
| Platform             | `feature/pegasoft-platform`    | #46, #47, hosting/security/recovery verification; coordinate CI edits with workflow owner |

## Enforcement

Install the shared local guard with `node .github/scripts/install-git-policy.mjs`. If existing default hooks are found, inspect them first, then use `--chain-existing` to preserve them and run them after the new guard; this includes Git LFS. An existing custom hooks directory requires explicit integration rather than replacement. The guard blocks commits from detached recovery checkouts/protected branches and blocks direct main/develop pushes. Its configuration and contract copy live in the common Git directory, so all linked worktrees share the guard. Reinstall after policy changes. Never bypass it with `--no-verify`; use the documented PR flow.

The branch-policy workflow validates branch names and PR routing. CI verifies pushes to `develop`; deployment conditions remain restricted to release staging and protected main production. Configure required checks on GitHub before treating CI as a server-enforced merge prohibition. Local agent instructions are a mandatory working contract, not a replacement for GitHub protections. Do not bypass checks, approval gates or secret handling to meet a deadline.
