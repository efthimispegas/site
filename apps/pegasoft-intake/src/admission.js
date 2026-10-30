const day = 86400000;
export const LIMITS = Object.freeze({
  day: 20,
  month: 600,
  cvDay: 5,
  emailDay: 40,
  emailMonth: 1200,
  dispatchDay: 40,
  dispatchMonth: 1200,
  recipientDay: 2,
  ipDay: 10,
  cooldown: 600000,
  bytes: 1000000000,
  rows: 1200,
  inventoryObjects: 4096,
  alertCooldown: day,
});
const idPattern =
  /^\d{13}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hashPattern = /^[0-9a-f]{64}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const encode = (value) => new TextEncoder().encode(value);
const hex = (value) =>
  Array.from(new Uint8Array(value), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
export function applicationMetadata(input, reference, createdAt) {
  return JSON.stringify({
    reference,
    audience: input.audience,
    values: input.values,
    createdAt,
    expiresAt: createdAt + 30 * day,
    privacyVersion: input.privacyVersion,
  });
}
export async function admissionInput(input, salt, ip) {
  const key = await crypto.subtle.importKey(
    'raw',
    encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const keyed = async (domain, value) =>
    hex(await crypto.subtle.sign('HMAC', key, encode(domain + ':' + value)));
  const bytes = input.cv
    ? Uint8Array.from(atob(input.cv), (c) => c.charCodeAt(0))
    : null;
  const cvHash = bytes
    ? hex(await crypto.subtle.digest('SHA-256', bytes))
    : null;
  const createdAt = Number(input.submissionId.slice(0, 13));
  return {
    submissionId: input.submissionId,
    createdAt,
    cv: !!bytes,
    // Exact body bytes plus conservative 2 KiB per object for keys/metadata overhead.
    bytes: bytes
      ? bytes.length +
        encode(
          applicationMetadata(
            input,
            '00000000-0000-4000-8000-000000000000',
            createdAt,
          ),
        ).length +
        4096
      : 0,
    fingerprint: await keyed(
      'payload',
      JSON.stringify({
        audience: input.audience,
        values: input.values,
        language: input.language,
        privacyVersion: input.privacyVersion,
        cv: cvHash,
      }),
    ),
    recipient: await keyed(
      'recipient',
      input.values.email.trim().toLowerCase(),
    ),
    ip: await keyed('ip', ip),
  };
}
export async function requestAdmission(env, path, body = {}) {
  const ns = env.ADMISSION.jurisdiction('eu');
  const response = await ns.get(ns.idFromName('launch-v1')).fetch(
    new Request('https://admission.internal' + path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
  const result = await response.json();
  if (!response.ok || result.allowed !== true)
    throw Error('admission_unavailable');
  return result;
}
/** Single launch-scale writer. Persistent rows are opaque hashes/counters only. */
export function createAdmissionCoordinator(
  storage,
  { now = () => Date.now(), uuid = () => crypto.randomUUID() } = {},
) {
  let tail = Promise.resolve(),
    cache;
  const queue = (fn) => {
    const result = tail.then(fn);
    tail = result.catch(() => {});
    return result;
  };
  async function load() {
    if (cache) return cache;
    const state = (await storage.get('state')) || {
      ids: [],
      orphanBytes: 0,
      orphanObjects: 0,
      inventoryAt: 0,
      alert: null,
      circuit: null,
      lease: null,
      recoveryReview: null,
      dispatches: [],
    };
    const rows = new Map();
    for (const id of state.ids) {
      const row = await storage.get('row:' + id);
      if (!row) throw Error('ledger_corrupt');
      rows.set(id, row);
    }
    cache = { state, rows };
    return cache;
  }
  async function save(state, rows, changed = [], removed = []) {
    try {
      await storage.transaction(async (tx) => {
        for (const id of changed) await tx.put('row:' + id, rows.get(id));
        for (const id of removed) await tx.delete('row:' + id);
        state.dispatches = (state.dispatches || []).filter(
          (at) => at > now() - 30 * day,
        );
        await tx.put('state', { ...state, ids: [...rows.keys()] });
        await tx.setAlarm(now() + day);
      });
      cache = { state: { ...state, ids: [...rows.keys()] }, rows };
    } catch {
      cache = null;
      throw Error('quota_store_unavailable');
    }
  }
  function usage(rows, state) {
    const all = [...rows.values()],
      recent = all.filter((r) => r.at > now() - day),
      month = all.filter((r) => r.at > now() - 30 * day);
    return {
      day: recent.length,
      month: month.length,
      cvDay: recent.filter((r) => r.cv).length,
      emailDay: recent.length * 2,
      emailMonth: month.length * 2,
      bytes: all.reduce((sum, r) => sum + r.bytes, 0) + state.orphanBytes,
      rows: all.length,
      dispatchDay: (state.dispatches || []).filter((at) => at > now() - day)
        .length,
      dispatchMonth: (state.dispatches || []).filter(
        (at) => at > now() - 30 * day,
      ).length,
    };
  }
  async function trip(reason, state, rows) {
    if (!state.circuit) {
      state = { ...state, circuit: { id: uuid(), reason, openedAt: now() } };
      await save(state, rows);
    }
    return { allowed: false, code: 'intake_paused' };
  }
  function rowFor(body, rows) {
    const row = rows.get(body.submissionId);
    if (!row || row.token !== body.token || row.reference !== body.reference)
      throw Error('reservation_mismatch');
    return row;
  }
  async function run(path, body, env) {
    let { state, rows } = await load();
    state = { ...state };
    rows = new Map(rows);
    if (path === '/pause') return trip('cleanup_unconfirmed', state, rows);
    if (path === '/cleanup-authorize') {
      const row = [...rows.values()].find(
        (r) => r.reference === body.reference,
      );
      return { allowed: !!row && row.expiresAt <= now() };
    }
    if (path === '/status')
      return {
        allowed: true,
        usage: usage(rows, state),
        limits: LIMITS,
        circuit: state.circuit,
        alert: state.alert,
        inventoryAt: state.inventoryAt,
        orphanObjects: state.orphanObjects,
        dispatchBusy: !!state.lease,
      };
    if (path === '/resolve-storage') {
      // No public route. Operator must pause intake, drain writers, verify expiry and approve one review ID.
      if (
        env.PEGASOFT_INTAKE_ENABLED !== 'false' ||
        !uuidPattern.test(env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID || '') ||
        body.reviewId !== env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID ||
        body.reviewId === state.recoveryReview ||
        body.writersDrained !== true
      )
        return { allowed: false, code: 'review_required' };
      const row = [...rows.values()].find(
        (r) => r.reference === body.reference,
      );
      if (
        !row ||
        row.expiresAt > now() - day ||
        !row.bytes ||
        state.lease?.id === row.id
      )
        return { allowed: false, code: 'review_required' };
      if (
        (await env.PRIVATE_APPLICATIONS.head(
          `applications/${row.reference}/cv.pdf`,
        )) ||
        (await env.PRIVATE_APPLICATIONS.head(
          `applications/${row.reference}/application.json`,
        ))
      )
        return { allowed: false, code: 'deletion_unconfirmed' };
      rows.set(row.id, {
        ...row,
        bytes: 0,
        storageState: 'released',
        reviewRequired: true,
      });
      state.recoveryReview = body.reviewId;
      await save(state, rows, [row.id]);
      return { allowed: true };
    }
    if (path === '/recover') {
      // Private binding only; requires intake OFF and a new owner-reviewed protected setting.
      if (
        env.PEGASOFT_INTAKE_ENABLED !== 'false' ||
        !uuidPattern.test(env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID || '') ||
        body.reviewId !== env.PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID ||
        body.reviewId === state.recoveryReview ||
        !state.circuit ||
        body.incident !== state.circuit.id ||
        (state.lease &&
          (state.lease.at > now() - 60000 ||
            body.resolveStaleLease !== 'hold')) ||
        state.inventoryAt < now() - day ||
        usage(rows, state).bytes >= LIMITS.bytes
      )
        return { allowed: false, code: 'review_required' };
      const changed = [];
      if (state.lease) {
        const row = rows.get(state.lease.id);
        if (!row) throw Error('lease_missing');
        rows.set(row.id, { ...row, reviewRequired: true });
        changed.push(row.id);
        state.lease = null;
      }
      state.circuit = null;
      state.recoveryReview = body.reviewId;
      await save(state, rows, changed);
      return { allowed: true };
    }
    if (path === '/reconcile') {
      const inventory = new Map();
      let cursor,
        total = 0,
        orphans = 0,
        objects = 0;
      try {
        do {
          const page = await env.PRIVATE_APPLICATIONS.list({
            limit: 1000,
            ...(cursor ? { cursor } : {}),
          });
          for (const object of page.objects) {
            objects++;
            if (objects > LIMITS.inventoryObjects)
              return trip('inventory_bound', state, rows);
            if (!Number.isSafeInteger(object.size) || object.size < 0)
              throw Error('inventory');
            const match =
              /^applications\/([0-9a-f-]{36})\/(?:cv\.pdf|application\.json)$/.exec(
                object.key,
              );
            const bytes = object.size + 2048;
            if (match)
              inventory.set(match[1], (inventory.get(match[1]) || 0) + bytes);
            else {
              total += bytes;
              orphans++;
            }
          }
          cursor = page.truncated ? page.cursor : null;
          if (page.truncated && !cursor) throw Error('inventory');
        } while (cursor);
      } catch {
        return trip('inventory_unconfirmed', state, rows);
      }
      const changed = [],
        removed = [];
      for (const [id, old] of rows) {
        let row = { ...old };
        const actual = inventory.get(row.reference) || 0;
        inventory.delete(row.reference);
        // Never release a potentially in-flight/uncertain write, even when absent in a list.
        if (
          row.expiresAt <= now() &&
          !actual &&
          ['reserved', 'complete'].includes(row.storageState)
        ) {
          row.bytes = 0;
          row.storageState = 'released';
        }
        if (actual > row.bytes) row.bytes = actual;
        if (row.at <= now() - 30 * day && !row.bytes) {
          rows.delete(id);
          removed.push(id);
        } else {
          rows.set(id, row);
          changed.push(id);
        }
      }
      for (const bytes of inventory.values()) {
        total += bytes;
        orphans++;
      }
      state.orphanBytes = total;
      state.orphanObjects = orphans;
      state.inventoryAt = now();
      await save(state, rows, changed, removed);
      if (usage(rows, state).bytes >= LIMITS.bytes)
        return trip('storage_budget', state, rows);
      return {
        allowed: true,
        usage: usage(rows, state),
        orphanObjects: orphans,
      };
    }
    if (
      env.PEGASOFT_INTAKE_ENABLED !== 'true' ||
      env.PEGASOFT_INTAKE_CAPACITY_VERIFIED !== 'true'
    )
      return { allowed: false, code: 'intake_unavailable' };
    if (path === '/complete') {
      const row = rowFor(body, rows);
      if (
        !state.lease ||
        state.lease.token !== body.lease ||
        state.lease.id !== body.submissionId
      )
        throw Error('lease_mismatch');
      state.lease = null;
      if (body.outcome === 'limited') {
        await save(state, rows);
        await trip('provider_rate_limit', state, rows);
        return { allowed: true, paused: true };
      }
      if (!['accepted', 'uncertain'].includes(body.outcome))
        throw Error('outcome');
      // Email slot reservations stay charged even for uncertain provider outcomes.
      await save(state, rows);
      return { allowed: true, reference: row.reference };
    }
    if (state.circuit) return { allowed: false, code: 'intake_paused' };
    if (state.inventoryAt < now() - day)
      return { allowed: false, code: 'capacity_unverified' };
    if (path === '/reserve') {
      if (
        !idPattern.test(body.submissionId || '') ||
        !Number.isSafeInteger(body.createdAt) ||
        body.createdAt !== Number(body.submissionId.slice(0, 13)) ||
        body.createdAt > now() ||
        body.createdAt <= now() - 30 * day ||
        ![body.fingerprint, body.recipient, body.ip].every((x) =>
          hashPattern.test(x || ''),
        ) ||
        typeof body.cv !== 'boolean' ||
        !Number.isSafeInteger(body.bytes) ||
        body.bytes < 0 ||
        body.bytes > 5131072 ||
        (body.cv ? body.bytes < 4097 : body.bytes !== 0)
      )
        throw Error('invalid_reservation');
      const old = rows.get(body.submissionId);
      if (old) {
        if (
          old.reviewRequired ||
          old.fingerprint !== body.fingerprint ||
          old.bytes !== body.bytes ||
          old.recipient !== body.recipient ||
          old.expiresAt <= now()
        )
          return { allowed: false, code: 'reservation_mismatch' };
        return { allowed: true, token: old.token, reference: old.reference };
      }
      const all = [...rows.values()],
        today = all.filter((r) => r.at > now() - day);
      if (
        today.filter((r) => r.recipient === body.recipient).length >=
          LIMITS.recipientDay ||
        today.filter((r) => r.ip === body.ip).length >= LIMITS.ipDay ||
        all.some(
          (r) =>
            r.fingerprint === body.fingerprint &&
            r.at > now() - LIMITS.cooldown,
        )
      )
        return { allowed: false, code: 'intake_cooldown' };
      const u = usage(rows, state);
      if (
        u.day >= LIMITS.day ||
        u.month >= LIMITS.month ||
        u.emailDay + 2 > LIMITS.emailDay ||
        u.emailMonth + 2 > LIMITS.emailMonth ||
        (body.cv && u.cvDay >= LIMITS.cvDay) ||
        u.bytes + body.bytes > LIMITS.bytes ||
        rows.size >= LIMITS.rows
      )
        return trip('admission_budget', state, rows);
      const row = {
        id: body.submissionId,
        at: now(),
        expiresAt: body.createdAt + 30 * day,
        fingerprint: body.fingerprint,
        recipient: body.recipient,
        ip: body.ip,
        cv: body.cv,
        bytes: body.bytes,
        storageState: 'reserved',
        reference: uuid(),
        token: uuid(),
      };
      rows.set(row.id, row);
      const next = usage(rows, state),
        high = Object.entries(next).some(
          ([key, value]) => LIMITS[key] && value >= LIMITS[key] * 0.8,
        );
      if (
        high &&
        (!state.alert || state.alert.raisedAt <= now() - LIMITS.alertCooldown)
      )
        state.alert = { raisedAt: now(), threshold: 80 };
      await save(state, rows, [row.id]);
      return { allowed: true, token: row.token, reference: row.reference };
    }
    const row = rowFor(body, rows);
    if (row.reviewRequired) return { allowed: false, code: 'review_required' };
    if (row.expiresAt <= now())
      return { allowed: false, code: 'submission_expired' };
    if (path === '/check') return { allowed: true, reference: row.reference };
    if (
      path === '/storage-start' ||
      path === '/storage-complete' ||
      path === '/storage-uncertain'
    ) {
      if (!row.cv || !row.bytes) throw Error('storage_reservation');
      rows.set(row.id, {
        ...row,
        storageState:
          path === '/storage-start'
            ? 'writing'
            : path === '/storage-complete'
              ? 'complete'
              : 'uncertain',
      });
      await save(state, rows, [row.id]);
      return { allowed: true };
    }
    if (path === '/dispatch') {
      if (!['internal', 'receipt'].includes(body.kind)) throw Error('dispatch');
      if (state.lease) {
        if (state.lease.at < now() - 60000)
          return trip('dispatch_unconfirmed', state, rows);
        return { allowed: false, code: 'dispatch_busy' };
      }
      if (!row.attempted?.[body.kind]) {
        const u = usage(rows, state);
        if (
          u.dispatchDay >= LIMITS.dispatchDay ||
          u.dispatchMonth >= LIMITS.dispatchMonth
        )
          return trip('dispatch_budget', state, rows);
        state.dispatches = [...(state.dispatches || []), now()];
        rows.set(row.id, {
          ...row,
          attempted: { ...row.attempted, [body.kind]: true },
        });
      }
      state.lease = { id: row.id, token: uuid(), at: now() };
      await save(state, rows, [row.id]);
      return { allowed: true, lease: state.lease.token };
    }
    throw Error('private_operation');
  }
  return {
    run: (path, body, env) => queue(() => run(path, body, env)),
    expire: () =>
      queue(async () => {
        cache = null;
        const { state, rows } = await load();
        const removed = [];
        for (const [id, row] of rows)
          if (row.at <= now() - 30 * day && !row.bytes) {
            rows.delete(id);
            removed.push(id);
          }
        await save(state, rows, [], removed);
      }),
  };
}
export class IntakeAdmission {
  constructor(ctx, env) {
    this.env = env;
    this.coordinator = createAdmissionCoordinator(ctx.storage);
  }
  async fetch(request) {
    try {
      if (request.method !== 'POST') throw Error('method');
      const result = await this.coordinator.run(
        new URL(request.url).pathname,
        await request.json(),
        this.env,
      );
      return Response.json(result, { status: result.allowed ? 200 : 503 });
    } catch {
      return Response.json(
        { allowed: false, code: 'intake_unavailable' },
        { status: 503 },
      );
    }
  }
  alarm() {
    return this.coordinator.expire();
  }
}
