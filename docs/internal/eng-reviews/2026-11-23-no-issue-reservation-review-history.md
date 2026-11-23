# Reservation review history API

Reviewed base `f4d7203cd` and the working diff. Issue and PR numbers were unavailable.
Result — access, privacy, and pagination findings addressed.

## Findings

| Severity and confidence | Evidence | Decision |
| --- | --- | --- |
| P1 (10/10) | The existing guest history query uses `review.reviewer_user_id = :guestId` in `backend/functions/ReviewSystem/data/reviewRepository.js:59`. Booking identity has separate fields. | Keep guest ownership in the query and require the booking ID, guest, property, and host to match the review before including context. Require the property's current host to match on the manager route. |
| P2 (10/10) | `backend/ORM/migrations/20260513_team_members.js:17` creates `CREATE INDEX ASYNC team_member_host_idx ON main.team_member (host_id)`. A member join can match multiple rows. | Use `SELECT DISTINCT` before `LIMIT` so duplicate memberships cannot consume page slots. The independent reviewer suggested `EXISTS` as another option. Distinct preserves the existing shared authorization query. |
| P2 (9/10) | The existing history success path uses `this.jsonResponse(200, result)`; `backend/functions/ReviewSystem/controller/controller.js:207` provides `"Cache-Control": "no-store"` for protected responses. | Apply no-store to successful reservation responses and expose only booking reference, arrival, departure, and status alongside the history fields. |

## Architecture decision

Reuse the authenticated review endpoint, existing guest history projection, publication eligibility, and property management permissions. Guests retain access to their own non-deleted review history, including drafts and rejected reviews. Property owners and active Property Operations Managers can read verified, published reservation reviews for completed bookings attached to the currently managed property. Queries fetch at most eleven unique reviews per page and reuse batched history enrichment.

```text
Authenticated caller ▶ guest ownership OR property-management + publication checks
                     ▶ matched booking context ▶ recent-first page ▶ allowed fields
```

## API

- Guest list uses `GET /reviews?scope=guest-history&review_type=GUEST_TO_RESERVATION`.
- Guest detail uses `GET /reviews/{id}?view=history&review_type=GUEST_TO_RESERVATION`.
- Property manager list uses `GET /reviews?scope=reservation-history&propertyId={id}`.
- Lists accept `offset` and return `next_offset`. The default guest history still returns property reviews.

## Failure modes

| Failure | Handling and verification |
| --- | --- |
| Absent authentication, missing manager identity, or forged scope | Returns 401, 403, or 400 respectively. Controller tests exercise all three. An unrelated manager's scoped query returns an empty page. |
| Missing or mismatched booking | Guest history retains the review with null context. Manager history excludes it. Tests verify booking hydration and the required join predicates. |
| Duplicate membership rows | The manager query deduplicates before pagination. SQL tests verify predicates, ordering, and page bounds. |

## Scope exclusions

- Platform moderation retains its existing queue and staff access paths. The reservation management view uses property-scoped permissions.
- Public aggregates, frontend, and schema changes are outside the retrieval task.
- Tests exercise controller responses and generated SQL without a live database.
