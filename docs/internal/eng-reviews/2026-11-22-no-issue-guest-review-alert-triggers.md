# Guest review notification workflow integration

Pull request / issue: not provided
Reviewed commit: 5479784c4
Base: 7eb9ccab3 (stacked feature parent)
Result: one P2 finding; fix approved, implementation pending. Review only; no runtime changes made.

## Findings

[P2] (confidence: 9/10) backend/functions/ReviewSystem/business/service/reviewService.js:510: rejection incorrectly requires present publication eligibility.

Evidence:
- reviewService.js:510: `return this.changePublicationState(review, review.status, "REJECTED", async (_current, manager) => {`
- reviewService.js:535: `this.assertPublicationBooking(await this.repository.findBookingById(review.booking_id), review, this.now());`
- data/reviewRepository.js:695 calls `await this.assertPublicationAllowed(` for every transition, including rejection.
- data/reviewRepository.js:763-770 loads the booking and calls `assertEligibleBooking(booking, review.reviewer_user_id, updatedAt)`.
- business/model/reviewRules.js:12: `if (!booking) throw new NotFoundException("Reservation not found.");`
- business/model/reviewRules.js:22-23 allows only paid/confirmed bookings and throws `Only paid or confirmed reservations can be reviewed.` otherwise.
- test/ReviewSystem/reviewGuestDelivery.test.js:49 mocks assertPublicationAllowed; lines 59-60 mock assertPublicationBooking and validateReviewPayload.

A review can already be pending/approved when its booking is later cancelled or
removed. An authorized administrator then cannot reject it, because both the
service and transaction require it to remain eligible for publication. Rejection
should stop an unsuitable review from progressing, rather than require that it
could still be published. The operation returns a booking error and no rejection
event is produced; the moderation workflow remains blocked.

Recommendation: separate rejection validation from publication validation in both
layers, preserving administrator allowlist/role checks inside the transaction,
allowed pending/approved source states, review identity and optimistic version
checks. Add a regression with a cancelled/missing booking and ensure unauthorized
and stale-version rejections still fail without events.
Decision: user approved option A: separate rejection from publication eligibility checks while retaining administrator authorization, allowed states and optimistic version checks; add regression coverage. Implementation pending; no runtime fix applied during review.

## What already exists

Reuses review_alert, review_alert_work, ReviewAlertRepository's atomic recipient /
event claim, the scheduled alert worker and existing email dependencies. Guest
ownership comes from persisted reviewer_user_id, matching the authenticated alert
API identity. Host/admin branches remain intact. First publication of a deleted
never-published response is now covered. No new tables, migrations or endpoints.

## Failure modes

| Path / failure | Coverage | Handling / user-visible result |
|---|---|---|
| Approval, rejection, publication transaction abort | Covered | No committed guest work, alert or email; operation rejects |
| Response draft, failed publication or restored draft | Covered | No draft/failed-event alert; restored first publication notifies once |
| Duplicate/concurrent delivery | Covered | Atomic alert claim prevents duplicate email attempts |
| Deleted response or changed review ownership | Covered | Fresh eligibility check suppresses delivery |
| Spoofed recipient / rejection body | Covered | Backend ownership lookup / request rejection |
| Email or user-lookup failure | Covered | Committed moderation survives; structured logs and durable work remain |
| Missing or cancelled booking during rejection | Missing | Publication validator blocks moderation; P2 above |
| Crash after commit, before immediate processing | No live recovery verification | Queue remains; configured domits-review-alerts schedule must recover it |

The inherited at-most-once email claim permits missing email after ambiguous
transport failure; retries do not resend an existing claim. In-app alert persists.

## Diagrams

    review/response transaction -> conditional write + guest outbox event -> COMMIT
                                     |
                                     v
    post-commit hook / scheduled worker -> fresh ownership + visibility checks
                                     |
                                     v
    recipient/event insert claim -> email (safe metadata only)

    PENDING_APPROVAL -> APPROVED -> PUBLISHED
           |               |
           +---- REJECTED --+
    response: draft -> [optional deletion] -> first published response

## Not in scope and architecture decisions

- Frontend: excluded by the story; backend guest destinations are supplied through existing alert/email output.
- New delivery tables or endpoints: reuse existing infrastructure; rejection uses PATCH /reviews/{id}?action=reject with updated_at.
- Live AWS scheduler/IAM setup: not inspected or changed; the repository contains no checked-in guest recovery deployment template/runbook in this commit.
- At-least-once email transport: retain existing at-most-once claims to prioritize duplicate prevention; possible email loss is an inherited tradeoff.
- Architecture follow-up: hostReviewRepository.js:1 imports the enqueue helper from reviewAlertWorkRepository.js, which imports HostReviewRepository at line 9. Extracting enqueue helpers would remove the new cycle. No initialization failure was demonstrated, so this is a nonblocking coupling note rather than a runtime defect.
- Earlier stacked branches: review covers this feature against 7eb9ccab3; the acceptance comparison includes 132 files and is not certified here.

Decision context: transactional outbox plus immediate post-commit attempts provide
durable recovery without new storage. The alternative of writing alerts during
moderation would couple delivery failure to the source transaction and is avoided.
Per-event reads and memory are bounded; repeated revalidation adds constant reads.

## Verification

Architecture, code-quality, tests and performance passes completed. Independent
review confirmed the P2 finding; no substantive disagreements. Six targeted Jest
suites passed (154 tests): guest delivery/rules, transaction entities, admin
delivery, alert processing and alert API. git diff --check passed. The reviewed
feature contains 282 changed lines before this report; total remains below 500.
