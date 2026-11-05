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

Copy `.env.example` to ignored `.env` for non-secret local configuration only. Provision real provider credentials in the Worker encrypted store, not local env files. Actual hostnames,
account/resource names, recipient/sender and credentials stay outside Git.
`configure` generates private TOML/JSON files only under ignored `dist/`.
No credential file is generated. The owner provisions runtime secrets directly into the existing Cloudflare Worker encrypted secret store. The protected runner only checks required names/types via metadata GET before and after deployment; it never retrieves or updates their values. Runtime credentials are stripped from the Wrangler child environment. The deployment token is never copied into Worker variables. Owner credential entry remains separate from code review and deployment approval.

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
and fixed disabled/retention/residency/file-size guards. Provision `PEGASOFT_TURNSTILE_SECRET`, `PEGASOFT_RATE_LIMIT_SALT` and `RESEND_API_KEY` directly as Cloudflare Worker secrets of those exact names. CI requires only the scoped Cloudflare deployment credential; no extra Resend or Turnstile credential copy in GitHub is required.

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
protected workflow verifies encrypted secret metadata without creating/copying values or activating processing. Sending `info@` at the root domain requires verification of that root
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
Unit checks cover concurrency, process restart, timeout, partial success, expiry and fail-closed gates. The separate `local-runtime-check` executes the bundled Worker logic in local workerd with the jurisdiction test adapter described below with actual SQLite-backed Durable Object storage and local R2. It verifies concurrent deduplication, persisted replay after disposing/restarting workerd, and the disabled gate. Every outbound request is intercepted; it sends no external email and deletes its temporary storage afterward. This does not qualify live Cloudflare placement, real provider acceptance, receipt inbox delivery, the 30-day alarm firing, or scheduled deletion.

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

## Admission, abuse and storage protection (not activated)

One EU-selected SQLite `IntakeAdmission` object (`launch-v1`) coordinates every
location. Successful field/PDF/challenge validation precedes admission; admission
precedes allocating any per-submission object, R2 write or provider send. A quota
outage fails closed. Rejected payloads are not queued or stored. The existing
approximate five-per-minute IP binding remains a cheap burst guard; the global
coordinator adds **ten new submissions per hashed IP in a rolling 24 hours**. This
conservative default may affect shared offices/mobile networks and requires
monitoring; rotating IPs do not bypass aggregate caps.

Compiled reviewed limits are 20 new submissions/24h, 600/30d, five CVs/24h,
40/1,200 notification-plus-receipt intent slots, two per normalized recipient/24h,
and a ten-minute identical-payload cooldown across fresh IDs. Atomic reservations
bind identity and immutable HMAC fingerprints; retries retain those reservations.
Recipient/IP/payload hashes use domain-separated HMAC with the private rate salt;
no addresses, names, raw IPs, CVs or messages enter this quota ledger. At most
1,200 rows are retained, including unresolved old storage. Zero-storage rows expire
after 30 days; unresolved byte reservations do not expire merely because their
admission window elapsed.

Intent reservations alone cannot bound delayed sends across days. Separate rolling
first-dispatch counters enforce 40/24h and 1,200/30d, counting each submission/kind
once before the first provider attempt. Same-key uncertain retries do not buy
another first-dispatch slot. These are application-controlled dispatch bounds,
not guarantees about inbox-arrival timing or other apps using the provider account.
A single durable dispatch lease prevents parallel provider calls. A `429` opens a
shared circuit immediately; old reservations and new IDs both stop. A crash leaves
the lease charged/held. After 60 seconds it requires owner review, never automatic
resend. This trades availability for bounded downstream effects and builds no
background retry backlog.

### Dedicated bucket accounting and reconciliation

The 1,000,000,000-byte budget charges exact PDF and application-JSON body bytes plus
a conservative 2 KiB per object for keys/metadata overhead. Entire-bucket inventory
includes unowned/non-prefix objects; their body bytes plus the same overhead remain
charged. No unknown object is automatically deleted. Inventory is bounded to 4,096
objects; a failed, oversized or incomplete scan pauses intake instead of assuming
zero usage. Each reservation records storage-start/complete/uncertain state before
a side effect. Partial writes and timeouts retain the entire byte reservation.
Successful inventory can raise accounting when actual objects exceed a reservation.

`PEGASOFT_INTAKE_CAPACITY_VERIFIED` defaults false and must remain false until the
owner verifies current account headroom, dedicated-bucket writer exclusivity,
provider allowance and the initial complete inventory. A successful inventory less
than 24 hours old is also required at runtime. The existing 15-minute cleanup job
performs reconciliation even while intake is off. This application budget is not a
Cloudflare account cap: unrelated writers/apps, request/operation charges and
provider headroom require separate live verification/monitoring. Pause intake
before any owner bulk upload or storage intervention.

Cleanup is bounded, only deletes ledger-owned expired application keys, checks
`HEAD` absence after deletion, then reconciles. A failed or delayed delete keeps
bytes charged and opens a pause. Expired, acknowledged writes are released only
when a complete inventory confirms absence. A write whose completion is uncertain
stays charged even when temporarily absent; it requires the private reviewed
resolution below. Lifecycle deletion, alarms, provider copies and Gmail retention
are independent; this code does not promise every copy disappears at day 30.

### Private aggregate status and owner recovery

The admission binding alone exposes aggregate `/status` (usage, limits, inventory
age, circuit incident, dispatch busy and one 80% threshold signal). There is no
public HTTP route, email alert sender, applicant data or new messaging destination.
The threshold signal can be raised at most once per 24 hours; no per-rejection
notification/log is created. Global quota exhaustion, provider limiting, stale
dispatch or unconfirmed cleanup opens a circuit. Per-recipient/IP/cooldown denials
do not let one sender intentionally pause everyone.

Recovery is never automatic. Keep intake off, inspect the aggregate incident,
provider outcomes and storage, and approve a fresh protected
`PEGASOFT_ADMISSION_RECOVERY_REVIEW_ID` UUID. A private `/recover` call must match
that one-use review ID and incident. A stale lease can only be resolved with
`resolveStaleLease: "hold"`: the affected submission is permanently held for review,
its counters remain charged and unrelated work may resume. No uncertain email is
blindly resent and caps cannot be raised through recovery.

For expired uncertain storage, the private `/resolve-storage` action additionally
requires intake off, an explicit owner attestation `writersDrained: true`, at least
24 hours beyond expiry, no active email lease for that submission, and successful
`HEAD` absence of both known keys. It holds that submission against replay and
releases bytes under a one-use owner review. Unowned objects require a separately
reviewed owner action; inventory can then confirm their absence. These are private
binding contracts, **not a deployed/authenticated operator console**. Live recovery,
account permissions, writer-drain procedures and actual expiry/deletion remain
qualification gates. Never reset/delete the ledger to manufacture headroom.

Tests include distinct-ID/botnet admission, immutable retry reuse, recipient/IP/CV/
monthly/byte/row bounds, cooldowns, dispatch-day boundaries, provider429, partial
storage, quota outages, cleanup failures, orphans, retention, alert cooldown and
reviewed stale-lease recovery. Local workerd uses actual SQLite and R2 for admission
concurrency and restart persistence. Local workerd rejects `jurisdiction()`, so the
test-only binding adapter asserts EU selection and maps to local storage; production
code still requests EU. The test does not qualify real geographic placement,
provider delivery, account usage/cost caps, live lifecycle/alarms or operator access.

### Owner-provisioned secret readiness

`worker-secrets.mjs` performs a gated metadata-only GET on the existing Worker settings, requiring exactly one `secret_text` binding for each of the three required names. Missing, duplicate or plain-text values block the disabled deployment before Wrangler runs. Post-deployment readback repeats the requirement. No runtime credential is fetched from Cloudflare or retained in CI, and deployment no longer includes a secret-update operation. Existing secrets are preserved by Wrangler; do not replace encrypted secrets with plain-text variables. The Cloudflare deployment token remains a separate protected GitHub credential.

A Turnstile widget/site key does not establish that the Worker secret, allowed hostnames, challenge action or frontend wiring are correct. Live email acceptance and inbox delivery need a separately reviewed protected test path with the already authorized owner inbox, two-email maximum, no CV, fixed retry identity, and public forms still disabled. A local mocked adapter/coordinator run is not that live qualification.

Provider reference: [Cloudflare secret configuration and preservation](https://developers.cloudflare.com/workers/configuration/secrets/).

## Current production plan and staged Contact release

Canonical trackers: [PC-006 and PC-014 in Pegasoft](https://github.com/users/efthimispegas/projects/1), [release pipeline #46](https://github.com/efthimispegas/site/issues/46), [hosting #47](https://github.com/efthimispegas/site/issues/47), and [gated analytics #57](https://github.com/efthimispegas/site/issues/57). Reuse these items instead of creating parallel gates. The independent PC-013 SEO review includes search favicon eligibility/refresh and AI/entity visibility. Remaining runtime-asset housekeeping #48 follows the critical forms path.

The owner selected **Contact first, Careers later**. Disabled is the deployment default. A manual `stage=contact` run requires the protected main workflow/owner review plus `PEGASOFT_CONTACT_ACTIVATION_READY=true`, verified capacity, one canonical origin and an explicit zone ID. It emits only the configured intake path route; workers.dev/previews stay off. Route readback must match exactly. Review the minimal zone Worker Routes permission and DO migration permission before any deployment; do not broaden credentials automatically. Run disabled qualification first and retain that stage as rollback. No route, flag or provider setting changes merely because the code exists.

Careers is forced off by deployment configuration and rejected independently by request handling, delivery and admission before CV side effects. Enabling it requires a later reviewed change after private access, quarantine, downloads/retention/deletion and recovery qualification. A Contact launch must never implicitly enable uploads.

Website Contact is a separate public build flag, default false. It requires qualified Contact, an approved matching full EN/EL privacy page/version, public Turnstile site key and same-origin `/api/...` path. No server key is exposed. The widget loads only on a deliberate submission; each attempt renders a fresh action-bound challenge. The form locks edits/tabs during submission, preserves drafts and retry identity on failure, and shows accepted partial-success accurately. Qualification includes a real challenge plus one controlled application-path synthetic enquiry and replay/failure/locale/mobile checks. Provider-only inbox authentication or a mocked widget does not complete this gate.

The full bilingual privacy page is a review draft covering Contact, future Careers, essential browser/security processing, providers/transfers, retention/copies, rights and external links. Public business/contact details come from explicitly allowlisted build configuration. Draft pages stay noindex and cannot satisfy Contact activation. Actual security-log retention, mailbox/provider arrangements and operating deletion still need confirmation; the copy does not certify compliance or every-copy deletion.

Analytics is **planned and gated**, not installed or activated. Issue57 owns provider/goals/events, minimization, consent/reject/withdrawal, EN/EL privacy updates, access/retention, test/staff/bot exclusions, performance and production readback/reporting. Link its work with PC-004 privacy, PC-006 conversion flow, PC-013 SEO, PC-014 release, #31 performance and #38 consent UI. Analytics does not block secure Contact while absent. Do not describe future tracking as active or insert trackers solely to clear an SEO checklist.
