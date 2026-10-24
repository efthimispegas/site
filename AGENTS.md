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

# Approved Pegasoft brand authority

The complete kit at `artifacts/pegasoft-concept/brand-proposal-20261025/` is user-approved as of 25 October 2026 and is the sole reference for any Pegasoft icon, brand logo or symbol. Read its `README.md` and `approval.json` when brand work is relevant. This includes colour SVG/PNG, variants, lockups, sizes, fonts, tokens and guidelines. Older studies/external references are historical; legacy proposed/provisional filenames do not mean approval is pending. Animation and website integration remain separate work.

The approved brand kit and historical review evidence are intentionally local-only and ignored. If that archive is absent, obtain the approved kit before changing brand artwork; do not invent a replacement. Production builds use the maintained application contracts and do not require local evidence.
