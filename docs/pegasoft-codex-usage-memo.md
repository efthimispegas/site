---
title: Pegasoft Agent Usage Guide
doc_type: operating-policy
owner: Pegasoft
audience: agents
status: active
version: 3.1
last_updated: 2026-09-27
read_mode: once_per_session
priority: high
policy:
  primary_metric: resources_per_accepted_outcome
  routine_context_review_tokens: 50000
  max_minor_task_verify_loops_before_reframe: 2
  stop_after_same_failure_passes: 3
  stop_new_parallel_dispatch_five_hour_used_percent: 70
  pause_core_window_used_percent: 95
---

# Pegasoft Agent Usage Guide

Optimize for accepted outcomes: correctness and evidence first, with the least
necessary context, model capacity, coordination, and repeat work. This guide
applies to every Pegasoft agent; no incident history is needed to use it.
Follow AGENTS.md, tool constraints, and the user's latest scope and budget.

## Required preflight

Before substantive work, establish the objective, owned files, minimum context,
suitable model, required checks, and stopping condition. Check current usage
before expensive work; do not infer available budget from an earlier session.
Read only the relevant policy sections on subsequent prompts.

Prefer a fresh, compact task for a new substantive request when authorized.
Continue a narrowly scoped task when it already owns the exact checkpoint or
when another handoff would add no value. Explain exceptions briefly. Execute a
new task's assignment directly; do not recursively create coordinators.

## General efficiency model

Local measurements support this directional model, not a fitted cost forecast:

```text
total token work = sum of input and output across all model calls
input = uncached input + cached input
expected outcome cost = execution + coordination + review + expected rework
burst risk rises with concurrent calls, context size, and model/speed cost
```

Repeated input processing can dominate output. Optimize context and call count
before shortening useful explanations. A short "continue" can resume a large
history; cached input still has a cost. Concurrent agents compress consumption
into less wall time, not necessarily less total work.

Apply these decisions:

- Reduce the context each call needs; retrieve details only for the current decision.
- Batch related checks and return summaries with evidence links, not repeated full logs.
- Delegate only when independent work saves enough time or improves quality to
  justify startup, coordination, and review.
- Use the least costly capable model; include likely retries in the decision.
- Keep independent review and mandatory acceptance checks. Savings that produce
  rework or unreliable evidence are not efficiencies.

No universal tokens-to-allowance conversion or reliable per-task credit forecast
has been established. Do not turn this model into a claimed billing prediction.

## Do: control context and model choice

- Use compact handoffs: objective, constraints, owned files, authoritative
  artifact links, current result, checks, and stop condition.
- Give authorized subagents self-contained assignments with no inherited history
  by default. State that others share the checkout and their edits must survive.
- Load recordings, screenshots, traces, large logs, and skill references only
  when required. Follow mandatory skill-reading rules; do not skip them for cost.
- Reassess routine work above 50K input tokens when telemetry exposes it. This is
  a local review trigger, not a platform limit. Checkpoint at a natural boundary;
  do not use repeated compaction as a context-management strategy.
- Prefer Luna-class capacity for extraction, inventories, concise documentation,
  and deterministic packaging; Terra-class for bounded implementation and tests;
  Sol-class for difficult debugging and substantive independent review.
  Reserve Astra-class capacity for a named unresolved architecture/graphics
  problem. These are capability defaults, not guarantees or fixed model versions.
- Select model/history overrides only where user authorization and tool rules
  permit them. Escalate with evidence; do not assume all agents need the same model.
- Keep stable reusable instructions concise. Small handoffs limit cold-cache
  exposure; cache hits cannot be guaranteed or forced by a scheduling trick.

## Do: coordinate, verify, and checkpoint

- Under spending constraints, use one implementation worker by default.
  Keep dependent implementation, checks, and packaging with one accountable
  owner. Parallelize only independent, non-overlapping ownership.
- Serialize browser, GPU, and build jobs. Documentation/accounting can run
  alongside them when file ownership is separate.
- Use repository skills and package-manager-prefixed Nx targets. Batch related
  edits before verification; inspect failing details rather than all output.
- Match checks to risk without dropping required gates. For structural changes,
  include relevant lint/typechecks; for tuning, retain focused regressions.
- After two rebuild/verify loops on a minor task, reassess the approach. After
  three failed passes on the same blocker, checkpoint and reframe instead of
  repeating unchanged work. Clarify an ambiguous visual target before more tuning.
- Before review, the owner checks completeness: required artifacts exist,
  check outcomes are explicit, links resolve, and evidence matches reviewed
  inputs. Missing packaging returns to the owner, not another approval round.
- Request one independent review of the complete frozen packet. Follow-up review
  targets unresolved findings and affected regressions; retain the full acceptance
  criteria. Reuse evidence when its required inputs and provenance still match.
  Rerun affected checks and mandatory milestone gates, not every suite after
  every edit. Record the rerun reason briefly.
- Preserve source references and historical evidence. Keep mutable status and
  dispatch records separate from normative acceptance inputs; never rewrite
  sealed hashes to make stale evidence pass.
- Keep one concise current-status entry point per repair boundary. Record each
  completed task in the owning ledger with its ID, outcome, checks, evidence
  links, and next action; do not create a duplicate completion narrative when
  the ledger and existing acceptance artifacts suffice. Use recoverable
  quarantine with an exact-path map only for proven redundant unsealed files.
- Handoffs should normally stay under 120 words and current-status summaries
  under 200 words. Default record: outcome; checks; evidence links; blocker/next
  action. Put logs, counts, and hashes in structured artifacts; reference stable
  policy instead of copying it. Add prose only for a new decision or unique
  technical reasoning. Do not create a report merely because a task ended.
- Distinguish implemented, tested, independently accepted, and personally
  visually approved. Functional success does not establish visual fidelity.
- End with results, checks, blockers, evidence links, and the next authorized
  action. Dispatch is not delivery. During visual phases, deliver a reviewable
  slice at each milestone. Respect phase gates; do not assign successors
  automatically.

## Budget and dispatch protocol

1. Query usage at session start, before a real dispatch, after a bounded
   execution batch, and near the stop threshold. Do not query before every
   status read or wait; those calls add coordination without advancing work.
2. Record dispatch ID, scope, model when known, acceptance state, and account
   snapshots only for real dispatches in the owning sprint ledger. Assign a
   single writer for shared status files.
3. At 70% five-hour usage, stop new parallel dispatch. At 95% usage in either
   available core window, pause allowance-only work and save a resume checkpoint.
   Shared activity, delayed telemetry, and in-flight calls prevent a guaranteed cap.
4. Report a threshold stop with completed work, current evidence/counts, blockers,
   and next action. Keep routine readings in the ledger; report new consumption
   information as requested without repeating already-known allowance settings.
5. Never infer permission to spend credits or redeem a reset. Obtain explicit
   authorization for each reset and any additional spending. Without a usable
   credit meter, disclose the limitation and request a bounded batch rather than
   promise an exact credit cutoff.

## Don't

- Resume a large cold history and launch multiple premium full-history agents
  for a small request; this can create a rapid allowance burst.
- Use repeated `wait`, status, or usage calls as a substitute for execution;
  they replay the same large context and can consume the window without
  changing the repository.
- Treat all review work as waste, substitute self-review for independence, or
  weaken assertions, tolerances, provenance, or visual gates to save tokens.
- Repeat broad scans, unchanged retries, frequent polling, or full-log reads
  when a saved checkpoint, bounded wait, or concise failure summary suffices.
- Attribute an account-wide usage jump solely to one task, equate raw tokens
  with billed credits, or count cached input/reasoning twice.
- Blame tool CPU/GPU runtime or answer length without measurements. Tool
  execution time is not itself a model-token count.
- Disable tools, required instructions, or safety checks to shrink context
  without authorization.

## Measurement standards

Track accepted outcomes rather than user-message counts. When available, record
model/speed, response count, uncached/cached input, output, retries, compactions,
checks, and acceptance. Compare similar task classes; raw volume alone does not
measure efficiency. Do not preserve rolling totals or daily incident tables here.

```text
uncached_input = input_tokens - cached_input_tokens
estimated_cost = sum_by_model_and_speed(
  (uncached_input * input_rate
   + cached_input_tokens * cached_rate
   + output_tokens * output_rate) / 1_000_000
)
```

Use current authoritative rates in an explicitly labeled estimate. Handle cache
writes separately only when applicable; reasoning is already part of output.
Actual credit spend requires authoritative metered billing deltas for the same
scope and period. Estimates are neither invoices nor allowance conversions.
Missing telemetry means unknown, not zero; do not sum cumulative counters.

Current data lives in the [ledger index](./ledger/INDEX.md),
[usage ledger](./ledger/usage-ledger.json), and
[dashboard](./ledger/usage-dashboard.html), not this policy.
Refresh with `node tools/docs/build-ledger.mjs` when current figures are needed
or after a meaningful batch (normally 5–10 new sessions/documentation changes).
The generator uses retained local telemetry and excludes conversation bodies;
missing or remote sessions and account billing are outside that evidence.
