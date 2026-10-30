# Private website intake

Independent Cloudflare Worker for contact/application processing. The website and
its approved graphics are separate. The current deployment contract forces intake
off, disables workers.dev/preview URLs and configures no public routes. Enabling
submissions requires another reviewed change after provider/privacy qualification.

Use Node/pnpm pinned by the workspace. Through Nx:

```sh
pnpm nx run-many --projects=@site/pegasoft-intake --targets=lint,test,verify-build,cloudflare-check,audit-cloudflare,local-runtime-check
```

Wrangler is pinned in the separate `cloudflare-tooling` lockfile to preserve the
website's dependency graph. Nx installs that toolchain with a frozen lockfile.
The compilation check uses synthetic configuration, no provider credential and no
network deployment. Server tests use synthetic storage/email/challenge bindings.
These checks do not prove real delivery, private access or retention enforcement.

## Configuration and CI

Copy `.env.example` to ignored `.env` for local configuration. Actual hostnames,
account/resource names, recipient/sender and credentials stay outside Git.
`configure` generates private TOML/JSON files only under ignored `dist/`.
No credential file is generated. Runtime secrets are allowlisted and kept in memory; after a disabled deployment the protected runner writes them directly to the existing Worker secret store over authenticated HTTPS. Runtime secrets are removed from the Wrangler child environment and arguments. The deployment token is never copied into Worker variables. Key creation and secure GitHub entry remain separate owner-controlled steps.

The `Pegasoft private intake` workflow checks pull requests without credentials.
Deployment is manual, limited to `main` and the `pegasoft-intake-production`
GitHub environment. Configure that environment with a required human reviewer,
no admin bypass and a branch policy allowing only `main`.

Use an account-owned Cloudflare token with **Editor** scoped to the existing intake
Worker only. Create that disabled Worker before creating the token, so CI does
not require account-wide creation rights. Pages and DNS management are outside this workflow. The new Durable Object migration needs a separate reviewed permission check before provider deployment; existing Worker-only credentials must not be assumed sufficient. Worker editing still permits changing
its code/bindings and therefore carries access to the data it processes.

Enter the token directly in the environment secret `CLOUDFLARE_INTAKE_API_TOKEN`.
Never paste it into chat, source, an issue, logs or an evidence packet. Configure
other environment values from `.env.example`; the workflow supplies source SHA
and fixed disabled/retention/residency/file-size guards. Store the Turnstile secret
and generated rate-limit salt in environment secrets of their matching names.

Keep `PEGASOFT_INTAKE_DEPLOY_READY` unset until the reviewed source is on `main`,
configuration is complete and the disabled deployment is approved. This readiness
flag does not approve public website release. After deployment, the workflow
reads back source revision, binding restrictions, endpoint flags and the expiry
schedule. It fails if the remote state differs and never reads CV objects.
Generated non-secret configuration files are deleted from the runner and not uploaded as artifacts. Remote verification failure needs investigation; it does not claim
automatic rollback.

## Before accepting applications

- Verify real email delivery to the approved destination and truthful UI status.
- Verify Turnstile, limits, EN/EL form behavior, errors and repeated submissions.
- Keep the R2 bucket private; CVs and metadata use opaque keys and 30-day expiry.
  Check both the saved lifecycle rule and scheduled cleanup using disposable data.
- Define authorized reviewer access and a malware/quarantine process. A PDF
  signature check is format validation, not malware clearance. Notifications
  contain no CV attachment or public download URL.
- Initial CV access is limited to the account owner through the private Cloudflare
  dashboard; no reviewer portal or additional human access is in launch scope.
- Website-intake Gmail copies also have a confirmed 30-day retention policy.
  [Owner-operated mailbox automation](tools/gmail-retention/README.md) is prepared
  for preview; permission grants, activation and actual enforcement are separate
  qualification gates. R2 cleanup does not delete Gmail copies.
- Approve company/privacy information and the remaining real launch content.

Official provider references: [Worker permissions](https://developers.cloudflare.com/workers/authorization/),
[email binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/),
[object expiry](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

## Resend migration contract (implementation, not activation)

The maintained code uses **one** email transport: Resend's HTTPS API. The old
Cloudflare `EMAIL` binding/send path is removed. No SDK or new workspace dependency
is required. The disabled deployment generator remains the only deployment path.
It adds a SQLite Durable Object class `IntakeDelivery` and its initial migration;
review that provider migration before any deployment. Worker calls select the EU
jurisdiction explicitly. This does not make the Resend service EU-only.

Configuration adds `PEGASOFT_RESEND_API_URL` and server-only `RESEND_API_KEY`. Enter
the credential through an approved secret-safe channel, never a tool response,
chat, frontend variable, source, test fixture containing real data, or log. The
protected workflow references the secret but neither creates it nor activates
processing. Sending `info@` at the root domain requires verification of that root
sending domain. Preserve inbound MX/routing and review exact sending DNS separately.

### Requests, acceptance and replay

Alongside the existing multipart fields and fresh Turnstile token, callers must
send `submissionId` as `<13-digit creation epoch milliseconds>_<UUID v4>` and
`language` as `en` or `el` (absent language defaults to English). Keep the same ID
and original payload for retries; never generate a new ID just because a response
was lost. IDs in the future or at least 30 days old are rejected. Client clock
alignment and this new contract must be qualified before frontend connection.
A server-generated opaque UUID remains the application reference in private R2
keys and notification subjects, preserving the existing Gmail retention selector.

A Durable Object serializes each identity, records a payload/message fingerprint
and independent internal/receipt states, and retains those for 30 days. It stores
hashes, delivery IDs and timestamps, not the form message or CV. Message bytes and
sender/recipient/copy are fingerprinted so changed configuration cannot reuse an
old provider key. Object alarms expire this ledger even while submissions are off.

Each provider request has its own stable idempotency key. Unconfirmed sends can
only be retried within **23 hours of the first attempt**, inside Resend's documented
24-hour window; older uncertainty requires manual review and is never blindly
resent. No background delivery retry/outbox or operator retry endpoint is exposed.
Caller retries require the same original payload and a fresh challenge. The frontend stays disabled and is not wired to this backend. Before activation it must create one stable ID per payload, retain it across transport retries (with a fresh Turnstile token), create a new ID only for changed/new payloads, handle the 202 partial-success states without duplicate internal notifications, and pass EN/EL browser tests. Operational reconciliation remains activation work.

- `201 submitted`: both messages accepted by the provider, not proof of inbox delivery.
- `202 submitted_receipt_pending`: internal notification accepted; receipt uncertain.
- `202 submitted_receipt_review_required`: internal accepted; receipt requires review.
- `503 delivery_uncertain` / `delivery_review_required`: internal acceptance uncertain.
- `410 submission_expired`: future/expired identity rejected.
- `409 submission_mismatch`: identity reused with different content/configuration.

Private CVs are not deleted on a mail timeout or receipt failure. Partial storage
writes remain quarantined with the original expiry and can be safely retried;
existing lifecycle and scheduled cleanup continue to remove expired objects.
Unit checks cover concurrency, process restart, timeout, partial success, expiry and fail-closed gates. The separate `local-runtime-check` executes the unmodified bundled Worker in local workerd with actual SQLite-backed Durable Object storage and local R2. It verifies concurrent deduplication, persisted replay after disposing/restarting workerd, and the disabled gate. Every outbound request is intercepted; it sends no external email and deletes its temporary storage afterward. This does not qualify live Cloudflare placement, real provider acceptance, receipt inbox delivery, the 30-day alarm firing, or scheduled deletion.

### Remaining gates

Owner review of the proposed warmer English/Greek receipts remains required.
Verify sending-domain authentication, region/tracking settings, provider-stored
email content and retention, scoped key provisioning, private reviewer access and
all operational tests before enabling forms. The Resend paid no-storage option is
not authorized. The interim Gmail recipient and its separately owner-controlled
retention process remain unchanged. No test sends to real applicants are permitted.

Provider references: [send API](https://resend.com/docs/api-reference/emails/send-email),
[idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Durable Object jurisdiction](https://developers.cloudflare.com/durable-objects/reference/data-location/).

### Disconnected browser client

`../pegasoft-concept/src/intake-client.js` is an opt-in, dependency-injected contract module. The live form does not import it; processing and the UI remain disabled. It has no default endpoint, fetch implementation, browser persistence or logging. Synthetic tests inject the challenge and transport. IDs and status live only in memory; browser reload recovery is not qualified. Do not add local/session storage for personal details, CVs, tokens or recovery state without a separate reviewed design.

The module snapshots a payload, hashes CV bytes (not just filename/size), preserves identity on unchanged retries and requests a new challenge for every attempt. Changed content or an explicit new-submission action starts a new identity. Concurrent clicks cannot launch another attempt. Known accepted 202 states survive later challenge/network/server failures and do not become an unsent message. Terminal success/review/conflict states prevent blind retry. English/Greek feedback is local text and never renders provider response text. These tests qualify the disconnected contract, not Turnstile UI, DOM wiring, physical devices, inbox delivery or live submissions.
