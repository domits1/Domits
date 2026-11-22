# Connect administrator review alerts to moderation workflows

Pull request / issue: not provided
Reviewed commit: ff4afe0f1; base: ab95cbb85 (stacked feature parent).
Result: two P2 findings; both fixes approved, implementation pending. Review only; no implementation changes.

## Findings
[P2] (confidence: 10/10) backend/functions/ReviewSystem/data/reviewAdminAlertRepository.js:34: normalize recipient identity before persistence.
Evidence: `.map(member => member.member_user_id.trim()))];` returns the Cognito username.
Producer evidence: host-team/auth/authManager.js:16 uses `userId: result.Username`; host-team/business/service/service.js:132 stores `member_user_id: pomUserId`.
Consumer evidence: ReviewSystem/auth/authManager.js:5 reads `claims.sub`; controller/controller.js:86 calls `callback(user.userId, user)`; data/reviewAlertRepository.js:50 queries `recipient_user_id: recipientUserId`.
For username staff and sub admin-id, delivery stores alerts under staff while GET alerts queries admin-id: the persisted notification is invisible to its administrator.
Recommendation: resolve the canonical sub from trusted backend user data for persistence, retaining username for allowlist/role checks and email lookup as needed. Add a username != sub integration test.
Decision: user approved canonical recipient ID resolution from trusted backend data and username != sub coverage. Implementation pending; email-only tests can miss this defect.

[P2] (confidence: 10/10) backend/infrastructure/review-requests/README.md:1 (deleted): restore unrelated invitation deployment guidance.
Evidence from the deleted file: line 1 `# Review invitation scheduler runbook`; line 6 `There is currently no checked-in scheduler deployment template in this directory.`
The diff deletes all 137 lines, including configuration, scheduler permissions and rollout checks for the existing invitation workflow, without a replacement.
Recommendation: restore the runbook unchanged; this deletion is outside administrator notification scope.
Decision: user approved restoring the invitation runbook unchanged. Implementation pending.

## What already exists

Reuses review_alert_work transactional outbox, scheduled worker, ReviewAlertNotificationService, ReviewAlertRepository and Review_Alert unique recipient/event claim. Existing global role AND allowlist authorization is retained. Immutable event timestamps and SQL recipient filtering address the preceding review findings. Host event branches are preserved.

## Failure modes

| Path / failure | Tested? | Handling and visible result |
|---|---|---|
| Submission/approval/flag transaction fails | Yes | No committed work; operation rejects; no delivery |
| Concurrent transitions or worker retries | Yes | Conditional updates and atomic alert claims prevent duplicates |
| Missing/ineligible review, resolved flag, revoked recipient | Yes | Empty candidates; no alert/email |
| Backend read or delivery dependency fails | Yes | Structured logs; unclaimed work retries; successful moderation remains committed |
| Email failure after persisted claim | Yes | At-most-once policy prevents resend; alert remains; email may be absent |
| Username differs from sub | No | No normalization/error; invisible persisted alert: critical gap |
| Crash before immediate processing / scheduler absent | No live verification | Durable work remains; recovery requires configured domits-review-alerts rule |

## Diagrams

    transaction: review/flag update -> durable admin event -> COMMIT
    post-commit hook / scheduled worker -> fresh rules + recipients -> atomic alert claim -> email
    DRAFT -> PENDING_APPROVAL -> APPROVED -> PUBLISHED; submitted states can acquire a pending flag

## Not in scope and decisions

- Frontend routing: excluded by story; inherited alert API destination remains /hostdashboard/reviews, whereas admin email links use the approval route. No claim of corrected in-app navigation.
- New tables/endpoints and host redesign: existing infrastructure satisfies storage/routing boundaries; preserve host behavior.
- Reliable email retries after ambiguous sends: keep existing at-most-once policy; duplicate avoidance takes priority, with possible email loss accepted by the inherited design.
- Live AWS provisioning: not verified; no tracked administrator recovery runbook/template exists in this commit.
- Full acceptance stack: 127 files differ; this review covers the named feature commit. Its parent diff is 445 changed lines before this report.

## Verification
Four passes completed: architecture, code quality, tests, performance. Independent reviewer confirmed both findings; no disagreement on severity. Repeated recipient revalidation is bounded by the configured administrator set, but repeats reads per recipient. Full ReviewSystem Jest run: 34 suites, 790 tests passed; git diff --check passed. No runtime code changes made.
