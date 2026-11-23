# Authenticated reservation review submission

Reviewed base `1322c00c4` and the working diff. Issue and PR numbers were unavailable.
Result — one coverage finding addressed. No blocking findings remain.

## Findings

| Severity and confidence | Evidence | Decision |
| --- | --- | --- |
| P2 (10/10) | At the reviewed base, `backend/test/ReviewSystem/hostReviewSubmission.test.js:6` declares `describe("POST /reviews host submission", () => {`. The reservation case in `backend/test/ReviewSystem/guestReviewTypes.test.js:11` exercises the service directly. | Run the shared HTTP submission suite for both host and reservation reviews so route, authentication and response mapping regressions are covered. |

The independent review confirmed the authenticated identity, booking-derived linkage, and type-scoped aggregate queries. It also confirmed that reservation category ratings require active configuration in the target schema.

## Architecture and existing behavior

The domain branch already supports reservation reviews through the existing route. Reuse the real handler, authentication, controller and service in tests and stub persistence. This covers the HTTP contract without adding a second route or write path. Existing repository tests cover transaction wiring, and public read tests verify the type filters used by the property and host aggregate queries.

```text
POST /reviews ▶ verified guest ▶ booking and category checks ▶ typed draft transaction
```

The service uses `{ booking_id: bookingId, review_type: reviewType, reviewer_user_id: callerUserId }` at `backend/functions/ReviewSystem/business/service/reviewService.js:644`. The repository writes the review and ratings together with the type-scoped request in `backend/functions/ReviewSystem/data/reviewRepository.js:171–183`. The aggregate queries share `review.review_type = :reviewType` in `backend/functions/ReviewSystem/data/reviewRepositoryShared.js:58`. The submission test adds no production queries.

## Failure modes

| Failure | Handling and coverage |
| --- | --- |
| Missing authentication or spoofed booking ownership | HTTP 401 or 403. API tests verify that neither can create a review. |
| Missing, cancelled, or incomplete booking | HTTP 404 or 400. API tests verify the response and absence of a write. |
| Invalid rating, feedback, or inactive or cross-type category | HTTP 400. API tests cover invalid payloads and verify category lookup by type. |
| Sequential or concurrent duplicate | HTTP 409. API tests exercise the duplicate lookup and simulated database uniqueness conflict, plus coexistence across all three types. |

## Not in scope

- Frontend and schema changes are unnecessary for the inherited submission workflow.
- Live database checks and applying the category seed remain deployment work for the target schemas.
