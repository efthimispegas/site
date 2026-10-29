# Private website intake

Independent Cloudflare Worker for contact/application processing. The website and
its approved graphics are separate. The current deployment contract forces intake
off, disables workers.dev/preview URLs and configures no public routes. Enabling
submissions requires another reviewed change after provider/privacy qualification.

Use Node/pnpm pinned by the workspace. Through Nx:

```sh
pnpm nx run-many --projects=@site/pegasoft-intake --targets=lint,test,verify-build,cloudflare-check,audit-cloudflare
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
Secrets are allowlisted separately; the Cloudflare deployment token is never
copied into Worker vars or generated secret files.

The `Pegasoft private intake` workflow checks pull requests without credentials.
Deployment is manual, limited to `main` and the `pegasoft-intake-production`
GitHub environment. Configure that environment with a required human reviewer,
no admin bypass and a branch policy allowing only `main`.

Use an account-owned Cloudflare token with **Editor** scoped to the existing intake
Worker only. Create that disabled Worker before creating the token, so CI does
not require account-wide creation rights. No direct R2, Pages or DNS management
permissions are needed for this workflow. Worker editing still permits changing
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
Generated configuration/secret files are deleted from the runner and not uploaded
as artifacts. Remote verification failure needs investigation; it does not claim
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
