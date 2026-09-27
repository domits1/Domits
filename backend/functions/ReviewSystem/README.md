# Review workflow

Apply `backend/ORM/migrations/20260922_review_workflow.js` before deploying this version of ReviewSystem. The migration adds review request delivery state and guest email preferences in both `main` and `test` schemas.

## Scheduled requests

Invoke ReviewSystem every 15 minutes with `{ "action": "PROCESS_REVIEW_REQUESTS" }` from an EventBridge scheduled rule. The Lambda's IAM role needs permission to invoke `EmailNotificationService` and `GetUserInfo` (used when a booking has no guest email). This repository does not manage EventBridge rules; the rule must be provisioned in the deployment environment. The worker processes up to 10 completed stays and 10 due sends per invocation by default. Repeated invocations are safe to run concurrently because requests have a unique booking/type/guest key and each send is claimed in the database.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `REVIEW_WINDOW_DAYS` | `30` | Eligibility and request expiry |
| `REVIEW_REQUEST_DELAY_HOURS` | `24` | Hours after checkout before the first email |
| `REVIEW_REMINDER_DAYS` | `7` | Days between sends |
| `REVIEW_MAX_EMAILS` | `2` | Initial email plus reminders |
| `REVIEW_FRONTEND_URL` | `https://domits.com` | Base URL for review links |
| `REVIEW_EMAIL_LAMBDA_NAME` | `EmailNotificationService` | Existing email delivery Lambda |
| `REVIEW_USER_INFO_LAMBDA_NAME` | `GetUserInfo` | Guest email fallback Lambda |

The email Lambda does not expose a delivery idempotency contract. If it sends an email but its response is lost, a retry can send that email again. The worker records claims and completed sends to prevent duplicate processing in normal operation.

## Review APIs

- `GET /reviews/notification-preferences` and `PATCH /reviews/notification-preferences` with `{ "emailEnabled": false }` control review request emails for the authenticated guest.
- `GET /reviews/moderation` lists submitted reviews and their verification evidence for moderators.
- `POST /reviews/{id}/moderate` accepts `{ "decision": "APPROVE" }` or `{ "decision": "REJECT", "reason": "..." }`. Approval of an automatically flagged review also requires a reason. Moderator decisions and overrides are persisted in review moderation and verification records.

The moderator queue is available in the web app at `/admin/reviews`. The API authorizes `admin`, `moderator`, and `review_moderator` roles.

The current automatic checks hold reviews with external links, long repeated character runs, very short text, repeated text from the same account, or at least three other reviews from that account in the previous day. They are signals, not a fraud score. A moderator still makes the publication decision.
