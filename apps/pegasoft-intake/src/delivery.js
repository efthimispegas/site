import { applicationMetadata, requestAdmission } from './admission.js';
import { receipt, sendResend } from './resend.js';
const day = 86400000;
// Leave a safety margin below the provider's 24-hour idempotency guarantee.
const retryWindow = 23 * 60 * 60 * 1000;
const retention = 30 * day;
export function submissionTime(id, now) {
  const match =
    /^(\d{13})_([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.exec(
      id || '',
    );
  const time = Number(match?.[1]);
  if (!match || time > now || now - time >= retention) return null;
  return { time };
}
async function hash(value) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', value)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
const jsonHash = (value) =>
  hash(new TextEncoder().encode(JSON.stringify(value)));
const reply = (status, code, reference) => ({ status, code, reference });

/** A single object owns one immutable submission and both independent sends. */
export function createDeliveryCoordinator(
  storage,
  {
    now = () => Date.now(),
    send = sendResend,
    uuid = () => crypto.randomUUID(),
    admission = (path, body, env) => requestAdmission(env, path, body),
  } = {},
) {
  let tail = Promise.resolve();
  async function execute(input, env) {
    if (env.PEGASOFT_INTAKE_ENABLED !== 'true')
      return reply(503, 'intake_unavailable');
    if (input.audience === 'Careers' && env.PEGASOFT_CAREERS_ENABLED !== 'true')
      return reply(503, 'careers_unavailable');
    const identity = submissionTime(input.submissionId, now());
    if (!identity) return reply(410, 'submission_expired');
    const reservation = {
      submissionId: input.submissionId,
      token: input.admissionToken,
      reference: input.reference,
    };
    await admission('/check', reservation, env);
    let record = await storage.get('delivery');
    const reference = record?.reference ?? input.reference ?? uuid();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        reference,
      )
    )
      throw Error('reference');
    const bytes = input.cv
      ? Uint8Array.from(atob(input.cv), (c) => c.charCodeAt(0))
      : null;
    const fingerprint = await jsonHash({
      ...input,
      cv: bytes ? await hash(bytes) : null,
    });
    const internal = {
      from: env.PEGASOFT_INTAKE_SENDER,
      to: [env.PEGASOFT_INTAKE_RECIPIENT],
      reply_to: input.values.email,
      subject: `Website ${input.audience} [${reference}]`,
      text: [
        'Audience: ' + input.audience,
        'Reference: ' + reference,
        ...Object.entries(input.values).map(
          ([key, value]) => key + ': ' + value,
        ),
        ...(bytes
          ? [
              'CV: private quarantine storage only. Authorized Cloudflare reviewers use reference above.',
            ]
          : []),
      ].join('\n'),
    };
    const acknowledgment = {
      from: env.PEGASOFT_INTAKE_SENDER,
      to: [input.values.email],
      reply_to: env.PEGASOFT_INTAKE_RECIPIENT,
      ...receipt(input.language, input.audience === 'Careers'),
    };
    const messages = { internal, receipt: acknowledgment };
    // Include actual message bytes: changed sender/copy/config must never reuse a provider key.
    const messageHash = await jsonHash(messages);
    if (
      record &&
      (record.fingerprint !== fingerprint || record.messageHash !== messageHash)
    )
      return reply(409, 'submission_mismatch');
    if (!record) {
      record = {
        fingerprint,
        messageHash,
        reference,
        expiresAt: identity.time + retention,
        stored: false,
        internal: { status: 'pending' },
        receipt: { status: 'pending' },
      };
      // Alarm and record must commit together before any R2/provider side effects.
      await storage.transaction(async (tx) => {
        await tx.put('delivery', record);
        await tx.setAlarm(record.expiresAt);
      });
    }
    if (record.expiresAt <= now()) return reply(410, 'submission_expired');
    if (bytes && !record.stored) {
      const prefix = `applications/${reference}/`;
      const metadata = {
        createdAt: String(identity.time),
        expiresAt: String(record.expiresAt),
        status: 'quarantine',
      };
      await admission('/storage-start', reservation, env);
      try {
        await env.PRIVATE_APPLICATIONS.put(prefix + 'cv.pdf', bytes, {
          httpMetadata: { contentType: 'application/pdf' },
          customMetadata: metadata,
        });
        await env.PRIVATE_APPLICATIONS.put(
          prefix + 'application.json',
          applicationMetadata(input, reference, identity.time),
          {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: metadata,
          },
        );
        await admission('/storage-complete', reservation, env);
      } catch {
        await admission('/storage-uncertain', reservation, env);
        throw Error('storage_unconfirmed');
      }
      record.stored = true;
      await storage.put('delivery', record);
    }
    for (const kind of ['internal', 'receipt']) {
      const state = record[kind];
      if (state.status === 'sent') continue;
      if (
        state.firstAttempt !== undefined &&
        now() - state.firstAttempt >= retryWindow
      ) {
        return reply(
          kind === 'receipt' ? 202 : 503,
          kind === 'receipt'
            ? 'submitted_receipt_review_required'
            : 'delivery_review_required',
          reference,
        );
      }
      state.firstAttempt ??= now();
      state.status = 'sending';
      await storage.put('delivery', record);
      let lease;
      try {
        ({ lease } = await admission(
          '/dispatch',
          { ...reservation, kind },
          env,
        ));
      } catch {
        return reply(
          kind === 'receipt' ? 202 : 503,
          kind === 'receipt'
            ? 'submitted_receipt_pending'
            : 'delivery_uncertain',
          reference,
        );
      }
      try {
        state.providerId = await send(
          messages[kind],
          `intake/${input.submissionId}/${kind}`,
          env,
        );
      } catch (error) {
        state.status = 'uncertain';
        await storage.put('delivery', record);
        try {
          await admission(
            '/complete',
            {
              ...reservation,
              lease,
              outcome:
                error?.code === 'provider_rate_limit' ? 'limited' : 'uncertain',
            },
            env,
          );
        } catch {
          /* The shared lease remains held; preserve known acceptance below. */
        }
        return reply(
          kind === 'receipt' ? 202 : 503,
          kind === 'receipt'
            ? 'submitted_receipt_pending'
            : 'delivery_uncertain',
          reference,
        );
      }
      state.status = 'sent';
      // A crash here leaves durable 'sending': retries retain the original provider key.
      await storage.put('delivery', record);
      try {
        await admission(
          '/complete',
          { ...reservation, lease, outcome: 'accepted' },
          env,
        );
      } catch {
        return reply(
          kind === 'receipt' ? 201 : 202,
          kind === 'receipt' ? 'submitted' : 'submitted_receipt_pending',
          reference,
        );
      }
    }
    return reply(201, 'submitted', reference);
  }
  return {
    run(input, env) {
      const result = tail.then(() => execute(input, env));
      tail = result.catch(() => {});
      return result;
    },
    expire() {
      const result = tail.then(async () => {
        const record = await storage.get('delivery');
        if (record && record.expiresAt > now())
          return storage.setAlarm(record.expiresAt);
        await storage.deleteAll();
      });
      tail = result.catch(() => {});
      return result;
    },
  };
}

/** No external route: reachable only via the Worker binding. Storage contains hashes/status, not messages/CVs. */
export class IntakeDelivery {
  constructor(ctx, env) {
    this.env = env;
    this.coordinator = createDeliveryCoordinator(ctx.storage);
  }
  async fetch(request) {
    if (this.env.PEGASOFT_INTAKE_ENABLED !== 'true')
      return Response.json({ code: 'intake_unavailable' }, { status: 503 });
    try {
      const result = await this.coordinator.run(await request.json(), this.env);
      return Response.json(result, { status: result.status });
    } catch {
      return Response.json({ code: 'intake_unavailable' }, { status: 503 });
    }
  }
  alarm() {
    return this.coordinator.expire();
  }
}
