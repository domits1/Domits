# Automated review requests

Deploy ReviewSystem code before deploying template.yaml with its Lambda ARN and execution-role name.
The stack creates a 15-minute EventBridge rule and narrowly scoped email/user-lookup invocation permissions.
Configure FRONTEND_URL on ReviewSystem for acceptance; it defaults to https://domits.com.
The existing review_request table must include its reminder columns and unique (booking_id, review_type, guest_id) index.

One atomic claim permits one email attempt per booking/type/guest. Existing reviews are excluded before batching
and checked again immediately before delivery. SENT records retain last_sent_at; FAILED records retain the claim.
SENDING records left after an invocation crash require investigation alongside FAILED records.
Do not automatically reset these states: email delivery may have succeeded before acknowledgement failed.
Reconcile against EmailNotificationService logs before manually authorizing another delivery attempt.
The email Lambda response must include a numeric 2xx statusCode; transport/function/non-2xx failures are tracked.
Tests use real TypeORM metadata/SQL generation with database execution and Lambda transport mocked.
No infrastructure is deployed and no real emails are sent by the test suite.

Set REVIEW_REQUEST_START_AT on ReviewSystem to the rollout time as an epoch timestamp in milliseconds.
Missing or invalid configuration stops candidate selection. Only checkouts at or after rollout and within
30 days are selected; new requests expire 30 days after checkout. No automatic reminders or retries run.
Publication completes requests without erasing delivery claims. Delivery acknowledgement preserves completion.
Use [reconciliation.sql](../../ORM/migrations/reconciliation.sql) with a bound stale_before_epoch_ms value to investigate failed or stuck requests.
Structured failure logs contain booking/request identifiers and error codes, without email addresses or content.
