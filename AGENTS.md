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

# Required context and usage preflight

Standing user agreement (2026-09-16): apply these prerequisites to every prompt.

- Before substantive work, choose the smallest necessary context, a suitable
  model, bounded scope, required checks, and a stopping condition. Respect any
  current allowance or credit restrictions; never promise an unmeasurable cap.
- For each new substantive user request, prefer a fresh task with a compact
  handoff instead of continuing a long conversation or forking its full history.
  The user has requested this workflow. Where task creation is unavailable or
  unsuitable, explain briefly and use a narrowly scoped continuation. Simple
  acknowledgments and clarifications need not create another task.
- A newly created task executes its assigned request directly: do not recursively
  create another task merely because its initial handoff is a prompt.
- Handoffs contain only objective, accepted constraints, owned files, relevant
  artifact links, current state, checks, and stop condition. Preserve decisions
  and evidence in project files rather than copying conversation history.
- When delegation is authorized, give every subagent a self-contained assignment,
  explicit file ownership, minimum relevant context, and its own acceptance
  checks. Use no inherited conversation history by default (`fork_turns: "none"`),
  explicitly select an appropriate model, and tell workers to preserve others'
  edits. Do not reuse oversized agents across unrelated assignments.
- Read specific artifacts, screenshots, recordings, and large outputs only when
  needed for the current decision. Batch related checks and return concise
  results with evidence links; avoid repeated full-history or full-artifact reads.
- Use docs/pegasoft-codex-usage-memo.md for detailed usage policy; load only the
  relevant policy section when needed.

# Lean delivery and review

- One owner completes dependent implementation, checks, and evidence packaging;
  delegate only independent work. Do not split packaging into approval rounds.
- Before independent review, verify every required artifact exists, checks have
  explicit outcomes, and evidence matches the reviewed inputs. Review the complete
  packet once; subsequent reviews focus on findings and affected regressions.
- Reuse valid evidence. Rerun checks affected by changed inputs plus mandatory
  milestone gates; never weaken tests, provenance, or review independence.
- Update the existing ledger: outcome, checks, evidence links, blocker/next action.
  No routine per-task Markdown report. Keep handoffs under 120 words and current
  status under 200 unless unique technical reasoning requires more.
- Merge baseline checkpoints into the current state and owning task instead of
  appending repeated history. Preserve unique decisions, acceptance limits and
  evidence links; archive superseded detail with explicit historical status.
  Routine resumption should require only the tracker, checkpoint and active task.
- Keep logs/hashes in artifacts, not repeated prose. Report delivered changes and
  blockers, not dispatch activity as progress. Visual phases deliver reviewable
  slices; functional checks never substitute for visual acceptance.

## Context and delegation controls

- Start Pegasoft work with `docs/ledger/CURRENT.md` and the relevant linked
  artifact only. Do not read the whole usage memo, sprint ledger, or `docs/`
  tree by default.
- Treat `docs/pegasoft-hero-baseline-plan.md` as the sole live authority for
  hero status, phase authorization, implementation scope, and next action.
  `docs/hero-reference/` status notes, sprint breakdowns, manifests, and
  reviews are evidence/history consumers; update them only to remove stale
  competing claims and preserve their provenance.
- Treat input above 50K tokens as a mandatory context review. For routine work,
  stop and create a compact handoff; do not resume a large history merely
  because the user says “continue”.
- One owner handles dependent S8 work end-to-end. Do not create coordinator,
  mapping, or review tasks while the owner is still missing a required artifact.
  Independent review starts once, after the packet is complete.
- Do not poll status in a loop. Use one bounded wait only when an active task is
  expected to produce work; otherwise read the saved checkpoint or ledger.
- Usage checks belong at session start, before a real dispatch, after a bounded
  execution batch, and at the 95% pause threshold—not before every status read
  or wait. Record account snapshots in structured ledgers, not repeated prose.
- A status response is not progress. Every continuation must either produce a
  changed artifact, a required check result, or a concrete blocker and stop.

# Agent Engineering Rules

## Repository Safety

- Inspect `git status`, active branch, relevant entry points, imports, runtime configuration, and repository conventions before editing.
- Preserve unrelated dirty work.
- Stage/commit only files within authorized scope.
- Respect explicit branch, file-exclusion, commit, and preview-before-apply instructions.
- Verify whether files are tracked/ignored before claiming they were delivered through Git.
- Use the project's configured package manager, runtime, scripts, and supported tooling.

## Debugging

- Reproduce failures before modifying code when practical.
- Diagnose from the earliest meaningful error rather than trailing log noise.
- Check existing environment variables, credentials, configuration, runtime paths, and provider status before requesting replacements.
- Preserve useful failed artifacts/logs.
- After three materially similar failed attempts, stop and record:
  - exact failure
  - attempted changes
  - evidence/logs
  - current hypothesis
  - recommended next step

## Verification

- Select checks proportional to the change.
- Source/type/build success does not prove runtime or visual correctness.
- UI requirements require rendered/runtime evidence.
- Interaction requirements require genuine interaction when practical.
- Visual requirements require visual inspection.
- Deployment requirements require verification of the remote artifact/result.
- Integration readiness requires configuration + authentication + successful protocol/tool interaction.
- Rerun checks affected by subsequent changes.
- Keep generated output isolated when evaluating source health.

## Evidence

- Associate evidence with its build/commit, configuration, environment, reference, and run.
- Never combine incompatible runs to manufacture a passing acceptance result.
- Distinguish:
  - implementation complete
  - automated checks passed
  - runtime verified
  - visual review passed
  - deployed
  - user accepted

## Browser / UI / Graphics Agents

- Inspect actual rendered output at applicable viewports.
- Verify keyboard/accessibility behavior when required.
- For animation, inspect normal playback and relevant transition boundaries; test reduced motion/reverse/alternate speeds when required.
- Do not infer visual correctness from source code or named animation states.
- Do not claim representative-device performance without measurements.

## Deployment / External Integrations

- Verify the relevant remote commit and deployed artifact before reporting deployment success.
- Do not equate installation, enabled configuration, or authentication UI with successful connectivity.
- Never expose credentials in logs, reports, documentation, commits, or memory.
- Keep integration setup changes scoped to the requested integration.

## Checkpoints

When work stops before completion, record:

- requested scope
- current branch/artifact
- completed changes
- verification performed
- unresolved failures
- deferred work
- exact resume point
