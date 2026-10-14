#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const repo = process.cwd();
const docs = path.join(repo, 'docs');
const out = path.join(docs, 'ledger');
const sessionsRoot = process.argv[2] ?? path.join(os.homedir(), '.codex', 'sessions');
const now = new Date().toISOString();
const mdFiles = [];
const walk = (dir, fn) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, fn); else fn(file);
  }
};
walk(docs, file => { if (file.endsWith('.md') && !file.includes(`${path.sep}ledger${path.sep}`)) mdFiles.push(file); });

const firstHeading = text => text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(text, '.md');
const classify = file => {
  const rel = path.relative(repo, file).replaceAll(path.sep, '/');
  if (rel === 'docs/pegasoft-codex-usage-memo.md') return ['canonical', 'usage-policy'];
  if (rel === 'docs/pegasoft-hero-baseline-plan.md') return ['canonical', 'current-status'];
  if (rel.includes('/repairs/s7/status.md')) return ['historical', 'decision-history'];
  if (/README\.md$/.test(rel) || /baseline-plan|repair-sprints\.md|motion-map|brand-direction/.test(rel)) return ['canonical', 'orientation'];
  if (/review|checkpoint|status-history|accounting-inventory|cleanup-/.test(rel)) return ['historical', 'decision-history'];
  if (/runs\//.test(rel)) return ['raw-evidence', 'run-artifact'];
  return ['reference', 'supporting'];
};
const docsIndex = mdFiles.sort().map((file, index) => {
  const text = fs.readFileSync(file, 'utf8');
  const [tier, kind] = classify(file);
  return {
    id: `D${String(index + 1).padStart(3, '0')}`,
    path: path.relative(repo, file).replaceAll(path.sep, '/'),
    title: firstHeading(text), tier, kind,
    bytes: Buffer.byteLength(text),
    lines: text.split('\n').length,
    retrieval: kind === 'current-status' || kind === 'usage-policy' ? 'read-first' : tier === 'raw-evidence' ? 'read-on-demand' : 'summary-first'
  };
});

const keys = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const add = (a, b) => Object.fromEntries(keys.map(k => [k, (a[k] ?? 0) + (b[k] ?? 0)]));
const zero = () => Object.fromEntries(keys.map(k => [k, 0]));
const quantile = (values, q) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
};
const usage = new Map();
const sessions = [];
const sessionFiles = [];
walk(sessionsRoot, file => { if (file.endsWith('.jsonl')) sessionFiles.push(file); });
for (const file of sessionFiles.sort()) {
  let cwd = null, model = null, effort = null, title = null, sessionId = null;
  const total = zero(); let records = 0; let compactions = 0;
  try {
    for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
      let event; try { event = JSON.parse(line); } catch { continue; }
      const p = event.payload ?? {};
      if (event.type === 'session_meta') { cwd ??= p.cwd; sessionId ??= p.id; }
      if (event.type === 'turn_context') { model = p.model ?? model; effort = p.effort ?? effort; }
      if (event.type === 'event_msg' && p.type === 'task_started') title = p.message ?? title;
      if (event.type === 'compacted') compactions++;
      if (event.type === 'token_usage_record' && p.usage) {
        const belongs = cwd === repo || (cwd && cwd.startsWith(path.dirname(repo)) && /pegasoft|hero|repair/i.test(file));
        if (!belongs) continue;
        const row = p.usage; Object.assign(total, add(total, row)); records++;
        const key = model ?? 'unknown';
        const bucket = usage.get(key) ?? { model: key, sessions: 0, records: 0, totals: zero(), sessionTotals: [] };
        bucket.records++; bucket.totals = add(bucket.totals, row); usage.set(key, bucket);
      }
    }
  } catch { continue; }
  if (records) {
    const key = model ?? 'unknown';
    const bucket = usage.get(key);
    bucket.sessions++; bucket.sessionTotals.push(total.total_tokens);
    sessions.push({ id: sessionId ?? path.basename(file, '.jsonl'), file: path.relative(sessionsRoot, file), cwd, model: key, effort, records, compactions, totals: total });
  }
}
const rates = { 'gpt-6-astra': { input: 250, cached: 25, output: 1250 }, 'gpt-6-sol': { input: 100, cached: 10, output: 500 }, 'gpt-6-terra': { input: 50, cached: 5, output: 300 }, 'gpt-6-luna': { input: 5, cached: 0.5, output: 30 } };
const byModel = [...usage.values()].map(row => {
  const rate = rates[row.model] ?? null;
  const uncached = Math.max(0, row.totals.input_tokens - row.totals.cached_input_tokens);
  const estimatedCreditEquivalent = rate ? (uncached * rate.input + row.totals.cached_input_tokens * rate.cached + row.totals.output_tokens * rate.output) / 1_000_000 : null;
  return { ...row, uncached_input_tokens: uncached, estimated_credit_equivalent: estimatedCreditEquivalent, percentiles: { p50_session_tokens: quantile(row.sessionTotals, .5), p90_session_tokens: quantile(row.sessionTotals, .9), p95_session_tokens: quantile(row.sessionTotals, .95) } };
});
const total = byModel.reduce((a, row) => add(a, row.totals), zero());
const ledger = { schemaVersion: 1, generatedAt: now, repository: repo, source: 'local JSONL token_usage_record telemetry plus retained 2026-09-16 evidence snapshot', privacy: 'No conversation or tool contents are exported.', documentCount: docsIndex.length, documents: docsIndex, usage: { total, sessionCount: sessions.length, models: byModel, sessions, rates, caveat: 'Credit equivalents are illustrative standard-rate estimates, not billing.' } };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'document-index.json'), JSON.stringify({ schemaVersion: 1, generatedAt: now, documents: docsIndex }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'usage-ledger.json'), JSON.stringify(ledger.usage, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
const modelRows = byModel.length ? byModel.map(row => `| ${row.model} | ${row.sessions} | ${row.totals.total_tokens.toLocaleString()} | ${row.percentiles.p50_session_tokens.toLocaleString()} | ${row.percentiles.p95_session_tokens.toLocaleString()} | ${row.estimated_credit_equivalent == null ? 'n/a' : row.estimated_credit_equivalent.toFixed(2)} |`).join('\n') : '| no local telemetry | 0 | 0 | 0 | 0 | n/a |';
const canonical = docsIndex.filter(d => d.kind === 'current-status' || d.kind === 'usage-policy').map(d => `- [${d.id} ${d.title}](../${d.path.replace(/^docs\//, '')}) — ${d.kind}`).join('\n');
fs.writeFileSync(path.join(out, 'INDEX.md'), `# Pegasoft documentation ledger\n\nGenerated: ${now}. Read [CURRENT.md](./CURRENT.md) first for operational status, then the baseline's active task; this index is a discovery aid; read historical packets and raw evidence only when a decision requires them. Re-run \`node tools/docs/build-ledger.mjs\` after 5–10 sessions/chats or when docs change.\n\n## Canonical entry points\n\n${canonical}\n\n## Dated usage snapshot\n\nTotal recorded tokens: **${total.total_tokens.toLocaleString()}** across **${sessions.length}** local sessions. The estimates below are not billing.\n\n| Model | Sessions | Tokens | P50/session | P95/session | Estimated credits |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${modelRows}\n\n## Retrieval rules\n\n- Prefer the canonical links above and the generated \`document-index.json\`.\n- Use \`tier: historical\` for chronology and prior decisions; do not treat it as current status.\n- Use \`tier: raw-evidence\` only to verify a claim or reproduce a result.\n- Current status and acceptance come from [CURRENT.md](./CURRENT.md) and the baseline plan; historical S7 results do not override them.\n- Usage metrics contain counts and metadata only; no raw conversation content is exported.\n\n## Live dashboard\n\nOpen [usage-dashboard.html](./usage-dashboard.html). It reloads the generated ledger every 30 seconds and shows model percentiles, token mix, estimated credits, and actionable efficiency feedback.\n`);
console.log(JSON.stringify({ documentCount: docsIndex.length, sessionCount: sessions.length, models: byModel.map(x => ({ model: x.model, tokens: x.totals.total_tokens })), totalTokens: total.total_tokens }, null, 2));
