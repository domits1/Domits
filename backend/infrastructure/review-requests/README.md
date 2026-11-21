# Review invitation scheduler runbook

This guide describes the setup required by ReviewSystem. Live AWS resources,
permissions, deployed code and scheduler state have **not been verified** by the
2026-11-21 engineering review. Restoring this document does not provision them.
There is currently no checked-in scheduler deployment template in this directory.
The engineer performing the rollout must record the environment, account, region,
responsible operator, rule ARN, target Lambda ARN/version, configuration and checks
in the deployment record before enabling delivery.

## Deployment order and setup

1. Keep the scheduler disabled while preparing the environment. Check for an
   existing rule before creating another source of invocations.
2. Apply the existing review/request schema and uniqueness migrations, then
   `backend/ORM/migrations/20261022_review_request_schedule.js` through the normal
   migration process. Confirm the application's schema has
   `property.review_requests_enabled` and `property.review_request_delay_hours`.
   The migration installs TRUE and zero-hour defaults in both test and main;
   confirm the intended property opt-ins before rollout.
3. Deploy the ORM and ReviewSystem code using the normal backend pipeline. Confirm
   that the deployed function includes the scheduling release-path IsNull fix.
4. Set `REVIEW_REQUEST_START_AT` on ReviewSystem to a positive integer **epoch
   timestamp in milliseconds** representing the approved rollout cutoff. Missing,
   zero or malformed configuration fails selection. The effective lower bound is
   the later of that cutoff and thirty days before the current run. Do not set an
   old timestamp merely to test: doing so can invite historical guests.
5. Set `FRONTEND_URL` explicitly for acceptance to its intended HTTPS origin.
   Missing/empty configuration defaults to `https://domits.com`. HTTP URLs,
   including `http://localhost:3000`, fail before candidates are claimed. Verify
   that the destination serves `/review?bookingId=...` and login/MFA returns there.
6. Optional email settings on ReviewSystem: `EMAIL_PROPERTY_IMAGE_BASE_URL`
   defaults to `https://accommodation.s3.eu-north-1.amazonaws.com`;
   `EMAIL_LOGO_URL` supplies an HTTPS logo. Both must be usable by external email
   clients without credentials. Verify image access with non-sensitive test data.
7. Verify the shared `GetUserInfo` and `EmailNotificationService` functions and
   grant ReviewSystem's execution role invocation permission on the intended
   dependencies. Confirm region/account resolution; notifier region uses
   `AWS_REGION`, falling back to `eu-north-1`. Verify database connectivity and
   access for ReviewSystem, dependency configuration, and the sender's SES setup.
8. Provision or inspect an EventBridge **scheduled rule** named exactly
   `domits-review-requests`, targeting the intended ReviewSystem Lambda. Suggested
   cadence: `rate(15 minutes)`. Add a Lambda resource policy allowing
   `events.amazonaws.com` invocation, restricted to that rule's ARN. Preserve the
   standard scheduled-event envelope: source `aws.events`, detail-type
   `Scheduled Event`, and resources containing the rule ARN ending in
   `/domits-review-requests`. A custom transformed payload or differently named
   rule will not enter the scheduler handler. Verify the configured target ARN,
   alias/version, account and region before enabling the rule.
9. Check Lambda timeout, dependency latency and concurrency against the batch of
   up to fifty candidates. Processing is sequential, with database checks and two
   synchronous Lambda invocations per send. Overlapping runs are guarded by
   conditional claims, but runtime capacity is not established by unit tests.
10. Verify logs/alarms and the email deployment gate below, then enable the rule
    under the deployment owner's approval. Observe an approved synthetic booking
    through selection, delivery, acknowledgement and login-return. A manual
    scheduler invocation can send real email and needs the same rollout controls.

## Shared email deployment gate

`EmailNotificationService-source/index.mjs` currently lives outside
`backend/functions/`; the backend function discovery loop will not deploy it.
The source adds optional `htmlBody` alongside the existing text body. This guide
does not establish which version is live or authorize a deployment.

Before rollout, identify the owner and deployment process for the shared sender,
record its deployed version and HTML capability, and verify an approved synthetic
message contains both text and HTML parts. Retain backward compatibility for
other callers that supply text only. A 2xx acknowledgement from the sender alone
does not establish HTML support. If the gate cannot be satisfied, keep rollout
disabled or obtain an explicit decision accepting text-only delivery. Integration
with the normal pipeline versus separate deployment remains an open review
decision; these instructions make that dependency visible without settling it.

## Runtime behavior

```text
completed paid/confirmed stay + cutoff + property enabled/delay
                         ▼
no existing review + no consumed request ▶ conditional claim
                                               ▼
                                            SENDING
                                               ▼
                          fresh identity/booking/review/settings checks
                              ▼                          ▼
                 deferred settings ▶ OPEN       guest/property lookup + email
                                                          ▼
                                            SENT / FAILED / CANCELLED
publication ▶ COMPLETED (delivery acknowledgement preserves completion)
```

Requests expire thirty days after checkout. Once claimed, delivery is an
at-most-once attempt: FAILED and stranded SENDING requests are not automatically
retried. A settings change detected before delivery releases an unsent claim to
OPEN. Disabling a property or the rule cannot recall an email already in flight.

## Monitoring and reconciliation

Watch invocation errors/timeouts and structured events
`REVIEW_REQUEST_DELIVERY_FAILED` and `REVIEW_REQUEST_PROCESSING_FAILED`.
Diagnostics include booking/request IDs, error type/code and dependency; avoid
copying guest data or message contents into logs or tickets. Batch responses can
contain FAILED or RECONCILIATION_REQUIRED even when the handler returns 200, so
monitor application diagnostics as well as platform invocation errors.

Inspect uncertain requests read-only in the relevant schema (main shown):

```sql
SELECT id, booking_id, status, claimed_at, last_sent_at, updated_at, expires_at
FROM main.review_request
WHERE status IN ('SENDING', 'FAILED')
ORDER BY updated_at ASC;
```

For each request, correlate ReviewSystem logs, dependency invocation evidence,
sender/SES evidence and any published review. An absent acknowledgement or
`last_sent_at` value is not proof that email was not sent. A timeout after the
sender accepted mail can leave the request SENDING. Preserve claim/status evidence
until the operator can distinguish a definite pre-send failure from an uncertain
delivery. Record the diagnosis and decision using IDs, without personal data.

Do not bulk-delete requests, clear claims or reset FAILED/SENDING to OPEN to
"retry": that defeats duplicate prevention. Any exceptional resend requires an
explicit per-request decision after reconciliation, fresh eligibility/settings/
expiry checks, and confirmation that no review already exists. There is no
automatic reconciliation or resend tool in this change.

## Pause and rollback

Disable the EventBridge rule to pause new scheduled batches; account for in-flight
invocations. For property-specific pauses, save disabled preferences and confirm
the resulting database value. Reconcile any in-flight claim before considering
resend. Keep the schema while scheduling-capable code remains deployed. Only use
the migration's down operation after incompatible application code is removed
and data-loss consequences are reviewed; it drops the two property preference
columns. No rollback or deployment was executed while restoring this guide.
