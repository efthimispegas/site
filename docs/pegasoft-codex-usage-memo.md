---
title: Pegasoft Codex Usage Memo
doc_type: operating-policy
owner: Pegasoft
audience: agents
status: active
version: 1.0
last_updated: 2026-06-18
read_mode: once_per_session
priority: high
token_scope:
  source_window_days: 30
  codex_tokens: 77676232
  codex_messages: 27
  skill_uses: 51
  peak_day: 2026-06-17
  peak_day_tokens: 16942787
  peak_day_messages: 7
kpis:
  avg_tokens_per_message: 2876897
  avg_tokens_per_day: 2589208
  avg_messages_per_day: 0.9
  avg_skill_uses_per_message: 1.89
  avg_tokens_per_skill_use: 1523063
  peak_day_token_share: 21.8
  peak_day_message_share: 25.9
  annualized_token_run_rate: 932114784
policy:
  primary_metric: tokens_per_delivered_outcome
  escalation_after_failed_passes: 3
  max_minor_task_verify_loops: 2
  burst_review_threshold_daily_tokens: 10000000
  burst_review_threshold_monthly_share_percent: 20
---

# Pegasoft Codex Usage Memo

## Intent

Use Codex as a delivery tool. Optimize for shipped outcomes, not low raw token usage.

## Baseline

- `77,676,232` Codex tokens over `27` messages
- `2,876,897` average tokens per message
- `51` skill uses over the same window
- `16,942,787` tokens on peak day `2026-06-17`

## Core KPIs

- `tokens_per_delivered_outcome`
- `avg_tokens_per_message`
- `tokens_per_feature`
- `tokens_per_bug_fix`
- `tokens_per_visual_pass`
- `peak_day_token_share`

## Cost Formulas

```text
monthly_cost = (monthly_tokens / 1_000_000) * price_per_1M_tokens
cost_per_message = (avg_tokens_per_message / 1_000_000) * price_per_1M_tokens
cost_per_peak_day = (peak_day_tokens / 1_000_000) * price_per_1M_tokens
```

## Working Rules

1. Use light sessions for planning, structure, and scoping.
2. Use heavy sessions for implementation, debugging, animation, QA, and release hardening.
3. Batch related edits before rebuild or screenshot verification.
4. Do not use implementation-grade sessions for planning-grade work.
5. Treat WebGL, animation, browser automation, and screenshot loops as premium-cost workflows.
6. After `3` failed passes, stop iterating and reframe the approach.

## Review Triggers

- `> 3.0M` tokens per message
- `> 10M` tokens in one day
- `> 20%` of monthly tokens consumed in one day
- `> 2` rebuild-and-verify loops for a minor task

## Agent Guidance

- Read this file once at session start when working in Pegasoft.
- Prefer outcome-based framing: define the exact change, then implement, then verify.
- Do not spend many output tokens for status updates, but address them in a final overview summary.
- Minimize repeated micro-edits followed by rebuilds.
- Run lint after structural code changes such as creating new components, pages, interfaces, or types.
- Skip lint for pure tuning passes on already existing components, variables, properties, attributes, or numeric values.
- If a task becomes visually ambiguous, rewrite the target before continuing.

## Principle

Spend tokens where they shorten delivery time or improve quality. Reduce tokens spent on repeated ambiguity, output and unnecessary feedback.
