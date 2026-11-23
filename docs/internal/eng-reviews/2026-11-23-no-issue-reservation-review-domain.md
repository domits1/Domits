# Reservation reviews

Issue and pull request numbers were unavailable at review time. Reviewed the working diff.
Result — no blocking findings after addressing review subject isolation and category setup.

## Findings

| Severity and confidence | Evidence | Decision |
| --- | --- | --- |
| P2 (10/10) | `backend/functions/ReviewSystem/business/service/reviewService.js:663` sets `reviewee_user_id` to `null` for reservations. `backend/functions/ReviewSystem/data/reviewRepository.js:450–451` uses `review.reviewee_user_id` for received reviews. | The existing host reviewee assignment would classify reservation feedback as a review received by the host. Keep the verified booking's host linkage and leave the user reviewee empty. |
| P2 (10/10) | `backend/functions/ReviewSystem/data/reviewRepository.js:356` uses `where: { reviewType, isActive: true }`. | Without category rows, validation rejects reservation ratings. Supply the types and labels through the existing category table and retain operator-managed settings on repeat runs. |

The independent review checked host response access. The HTTP response query already filters by property review type at `backend/functions/ReviewSystem/data/hostReviewRepository.js:222` with `reviewType: "GUEST_TO_PROPERTY"`. The separate legacy response repository helpers have no production callers in the supplied tree.

## Architecture decision and existing components

Use the guest review path and store the three category definitions as configuration. The existing `VARCHAR(50)` type and unique index on `(booking_id, review_type, reviewer_user_id)` support the new type without a schema migration. The existing transaction persists the review, ratings and type-scoped request. The guest's generic written reviews and the staff moderation queue can include reservation reviews. Existing private feedback permissions apply, including listing-host access to the host-facing private field.

```text
Guest ▶ booking eligibility ▶ typed duplicate and category checks ▶ draft
Draft ▶ guest submission ▶ pending approval ▶ staff approval ▶ publication
```

## Failure modes and verification

| Failure | Handling and coverage |
| --- | --- |
| Unknown type or inactive or cross-type category | HTTP 400 via shared validation. Tests exercise each case. |
| Missing, unrelated or ineligible booking | HTTP 404, 403 or 400. Tests verify rejection and revalidation before moderation. |
| Repeat or concurrent submission | The lookup and database unique constraint both map to HTTP 409. Tests exercise both paths and coexistence with property and host reviews. |
| Category configuration has yet to be loaded | Requests with reservation category ratings receive HTTP 400. Apply the seed before enabling category submissions. Live DSQL execution and index parity were unavailable for this review. |

The new type uses the existing indexed duplicate lookup, conditional category lookup and transactional writes. Property and host aggregation queries retain their type filters.

The ReviewSystem suite passed all 957 tests across 39 suites.

## Deployment

Run the configuration seed with `psql -v ON_ERROR_STOP=1 -v review_schema=test -f backend/scripts/seed-reservation-review-categories.sql` using the appropriate database connection. Apply the same file with `review_schema=main` to the main schema. The seed preserves existing rows, including inactive ones.

## Scope exclusions

- Frontend changes and public reservation aggregates were outside the backend domain change.
- Automated booking invitations, property-only history views and property alert policies retain their existing scopes.
