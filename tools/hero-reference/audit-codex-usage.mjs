// Read-only local telemetry audit. Never exports conversation or tool contents.
// Usage: node tools/hero-reference/audit-codex-usage.mjs [sessions-directory]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const directory = process.argv[2] ?? path.join(os.homedir(), '.codex/sessions');
const start = '2026-09-16T09:30:00Z';
const end = '2026-09-16T09:51:05Z';
const burstEnd = '2026-09-16T09:38:00Z';
const keys = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.jsonl') && fs.statSync(file).mtimeMs >= Date.parse(start)) files.push(file);
  }
}
walk(directory);
const sessions = [];
const seen = new Set();
for (const file of files.sort()) {
  let model = null, effort = null, previous = null, cwd = null, agent = null;
  const records = [], samples = [], deltas = [], compactions = [], toolCalls = {};
  for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const p = event.payload;
    if (event.type === 'session_meta') {
      cwd ??= p.cwd;
      agent ??= p.source?.subagent?.thread_spawn?.agent_path ?? (p.source?.subagent?.other === 'guardian' ? 'guardian' : null);
    }
    if (event.type === 'turn_context') { model = p.model; effort = p.effort; }
    const active = event.timestamp >= start && event.timestamp < end;
    const burst = active && event.timestamp < burstEnd;
    if (active && event.type === 'token_usage_record') {
      const id = p.response_id ? `${p.thread_id}:${p.response_id}` : `${file}:${event.ordinal}`;
      if (!seen.has(id)) {
        seen.add(id);
        records.push({ timestamp: event.timestamp, model, effort, ...p.usage });
      }
    }
    if (event.type === 'event_msg' && p?.type === 'token_count') {
      const total = p.info?.total_token_usage;
      if (total) {
        if (active && previous) deltas.push({ timestamp: event.timestamp, ...Object.fromEntries(keys.map(k => [k, total[k] - previous[k]])) });
        previous = total;
      }
      if (active && p.rate_limits?.primary) samples.push({ timestamp: event.timestamp, usedPercent: p.rate_limits.primary.used_percent, resetsAt: p.rate_limits.primary.resets_at });
    }
    if (burst && event.type === 'compacted') compactions.push(event.timestamp);
    if (burst && event.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(p.type)) toolCalls[p.name] = (toolCalls[p.name] ?? 0) + 1;
  }
  if (records.length || samples.length) {
    const sum = rows => Object.fromEntries(keys.map(k => [k, rows.reduce((n, r) => n + (r[k] ?? 0), 0)]));
    const burstRecords = records.filter(r => r.timestamp < burstEnd);
    sessions.push({ file: path.relative(directory, file), cwd, agent: agent ?? 'root-or-other-user-task', burstRecords: burstRecords.length, burstUsage: sum(burstRecords), burstCounterDelta: sum(deltas.filter(r => r.timestamp < burstEnd)), compactions, toolCalls, records, samples });
  }
}
console.log(JSON.stringify({ schemaVersion: 1, timezone: 'Europe/Athens', start, end, burstEnd, method: 'Unique response token_usage_record usage; independent cumulative token_count delta cross-check. Cached input is a subset of input; reasoning is a subset of output. No raw conversation contents exported.', sessions }, null, 2));
