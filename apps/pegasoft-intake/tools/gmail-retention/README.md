# Owner-controlled mailbox retention

Prepared source only. Nothing here grants Gmail access, creates a trigger or
deletes real mail. This runs in a private Apps Script project owned by the intake
mailbox owner, separately from the website, Worker and deployment token.

Policy: website-generated Contact/Careers email copies become eligible for
permanent deletion at 30 days. CVs and application records have their separate
30-day R2 policy. Only the owner reviews CVs through the Cloudflare dashboard.
Notifications contain no CV attachment or public download link.

## Preview setup

1. In the confirmed Gmail account, create a dedicated intake label and a filter
   matching the exact technical sender and website-notification subject format.
   Do not use a general inbox, catch-all label or an entire conversation as the
   deletion selector. Verify the filter with a disposable synthetic notification.
2. Create a private standalone Apps Script project in that same account. Copy
   `Code.js` and the read-only `appsscript.json`; enable its advanced Gmail service.
   Keep project sharing private. No web-app deployment is needed.
3. Configure the properties from `.env.example` in Script Properties. Real mailbox,
   sender and label values stay out of source control. Leave DELETE_READY empty.
   The label ID may be empty for the first preview: the exact unique user-label
   name is resolved and the ID is pinned only after the preview succeeds.
4. The owner reviews Google's read-only authorization prompt, then runs
   `previewIntakeRetention`. It verifies the signed-in mailbox, dedicated label,
   received timestamp, sender, sole recipient and exact notification subject.
   Only metadata is read. Counts/cutoff are logged; no body, address, subject,
   application reference or message identifier is logged by the script.
5. Inspect the dedicated label in Gmail and compare the preview's cutoff/count
   against known synthetic messages. Test wrong-label, recent and unrelated mail.

## Separate destructive activation

An optional `Qualification.js` is provided for an isolated protocol test before
activation. Copy it into the same private project without changing the default
read-only manifest. Merely saving it does not grant write/deletion permission.

For the creation/preview stage, use `appsscript-qualification.json` only after the
owner approves the added insert and label-management permissions. These are
mailbox-wide capabilities, not permissions restricted to the test label. This
manifest retains read-only access and does not grant permanent deletion or sending.
The owner completes Google's consent flow personally. Full-mail permission stays
deferred until the separate deletion test is reviewed.

After the owner separately approves the expanded Google permission and fixture
creation, configure a new TEST_LABEL_NAME and FIXTURE_CREATE_READY. The helper
creates that new label and inserts three clearly marked synthetic messages into
the owner's mailbox: one 31-day-old matching notification, one 1-day-old matching
control and one 31-day-old unrelated control. It sends no emails, modifies no
existing messages and does not reuse a pre-existing test label. Partial failures
retain the recorded IDs for owner review, without automatic deletion or retry.
If insertion failed before creating any message, the explicit
`resumeEmptyIntakeRetentionFixtures` recovery verifies unchanged configuration,
the recorded label identity and an empty label before inserting the original
three controls. It rejects partial insertions and unknown messages; never reset
fixture state to bypass those checks. Apps Script's media-upload argument must
precede the `internalDateSource` options even when the MIME is supplied as raw data.

Gmail can apply existing incoming-message filters to inserted fixtures. The
metadata-only `inspectIntakeRetentionFixtures` reports identity checks as booleans
without message IDs, addresses or content. If the production label was applied,
remove that label only from the identified synthetic messages in the dedicated
test label, preserving the test label and all messages. Do not relax the preview
guard or enable production deletion while test fixtures carry the intake label.

Run `previewIntakeRetentionFixtures`: only the expired matching fixture must be
eligible, with both controls preserved. Unknown membership, changed configuration,
missing markers or any fixture carrying the production intake label stops the test.
Only after reviewing those results and giving explicit approval for permanent
deletion should FIXTURE_DELETE_READY be set and
`deleteExpiredIntakeRetentionFixture` run. It can request deletion of just the
single known expired fixture, never a real intake notification. Inspect Gmail to
verify disappearance and both remaining controls; API acceptance alone is not
proof. Remove/revoke test gates afterward. The two synthetic controls remain until
the owner separately decides how to clean them up.

This test does not qualify Cloudflare email delivery, scheduled execution, real
applicant files, or the handling of replies and forwarded copies.

After the owner approves preview results, replace the manifest with the contents
of `appsscript-deletion.json`. Google requires full-mail scope for permanent
deletion; this permission is broader than the code's label restriction. Only the
owner grants that permission. The website/Cloudflare/agent receive no Gmail token.

Only after explicit approval for recurring permanent deletion should the owner set
`PEGASOFT_GMAIL_DELETE_READY=true` and install an hourly time-driven trigger for
`deleteExpiredIntakeNotifications`. It rechecks eligibility and deletes message
IDs, never threads, through a single bounded API call. Maximum 200 candidates per
run; wrong account, changed unpreviewed config, unexpected pagination, or excess
backlog fails without deletion. Do not increase these limits without review.

Eligibility starts at 30 days; actual removal occurs on the next successful
scheduled run, normally within an hour. Triggers can fail or be delayed: monitor
Apps Script Executions/failure emails and the LAST_SUCCESS_AT property. A successful
API request alone is not proof every message was deleted. Verify disappearance
using disposable messages and monitor the label for overdue records before
claiming enforcement in privacy copy.

To stop deletion, clear DELETE_READY and remove the trigger. This does not restore
permanently deleted mail. Do not empty unrelated Trash or bulk-delete threads.
The selector deliberately excludes replies, forwarded copies and Sent/Drafts;
avoid copying intake personal data into those places, and resolve their handling
in the operating/privacy policy. Downloads and third-party correspondence are
not covered by Gmail or R2 cleanup.

## Qualification still required

Local synthetic tests validate selection and guards, not Google's deployed API.
Owner preview authorization, exact filter/label validation, real synthetic deletion,
trigger installation/failure visibility, and retention wording remain launch gates.
No real applicant data should be used for qualification.

References: [advanced Gmail service](https://developers.google.com/apps-script/advanced/gmail),
[message listing](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list),
[permanent batch deletion and required scope](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchDelete),
[installable triggers](https://developers.google.com/apps-script/guides/triggers/installable).
