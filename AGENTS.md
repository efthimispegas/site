# Pegasoft shared working contract

- Before work, read `docs/deployment/git-workflow.md`, `docs/deployment/staging.md` and applicable scope instructions. This applies to every existing and future chat.
- Human work uses one owned `feature/pegasoft-<scope>` branch/worktree per stream; reviewed PRs target `develop`. Never commit directly to `main`, `develop` or a completed release. Verify Git state rather than relying on the chat's branch indicator.
- `release/<major>.<minor>.<patch>` retains the established staging → owner review → main PR/CI → protected production approval → live verification → version tag flow. Do not promote or deploy merely because a feature PR is ready.
- Preserve unrelated WIP, shared-file ownership and approved UI. Keep evidence/review/history media and private data local; only required runtime assets belong in published source. Legacy detached worktrees are recovery-only, not publishable branches.
- For all UI/UX work, read and use Taste (`design-taste-frontend`) alongside Impeccable. Preserve Pegasoft tokens, shared components, responsive/reduced-motion behavior and separate visual/device/release gates. Report unavailable guidance and actual verification limits.

## Efficient context and token use

- Optimize tokens per verified outcome. Load only the applicable contract, skill and owned files; reuse already-read context unless it is stale. Keep handoffs concise and current: scope, owner, result, limits, blocker and next gate.
- Batch independent reads and related edits. Run proportionate verification once; repeat when a change, failure or unresolved concern justifies it. Avoid repeated full dumps, screenshots and builds with no new question to answer.
- After repeated failed approaches, diagnose and reframe instead of running the same loop. Preserve required acceptance checks and do not trade correctness, approval gates or user data for lower token usage.
- Retired usage statistics, historical task ledgers and the original kickstart plan are not active authority. Current directives live here and in the linked workflow/layout/runbooks; model/effort follows current user and platform instructions.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
