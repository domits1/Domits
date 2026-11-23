# Host review retrieval and ratings

Pull request: not opened
Issue: supplied host review retrieval user story
Reviewed commit: f44bb0dde plus working tree changes
Result: no blocking findings; independent second review agreed.

## What already exists

Reuse ReviewSystem's GET `/reviews`, authenticated controller wrapper, pagination
validation, repository delegation, TypeORM aggregation and completed-stay policy.
`eligibleReviewQuery` accepts a type argument with the unchanged property default.
No new tables, migrations, Gateway resources or dependencies are required.

## Interface and decisions

- Public: `GET /reviews?scope=host-public&hostId=<host>&limit=20&offset=0`.
- Dashboard: `GET /reviews?scope=host-dashboard&limit=20&offset=0`, requiring verified authentication. Host identity comes exclusively from the caller's subject; ownership overrides are rejected.
- Both return `host_id`, `overall_score`, `review_count`, `category_ratings`, `reviews` and `next_offset`.
- Categories are communication, responsiveness and hospitality. Missing averages are `null`; empty counts are zero.
- Default page size is 20, maximum 100; offsets are bounded to 100000. Ordering is creation time descending, then ID descending.
- Published host reviews are public data. The authenticated dashboard intentionally returns the same public projection; no private host data is exposed.

## Findings and decisions

No blocking findings across architecture, code quality, tests and performance.
The independent review agreed with the ownership, eligibility and projection boundaries.

Evidence (paths relative to `backend/functions/ReviewSystem/`):

- `data/publicReviewRepository.js:42`: `review.host_id = :hostId AND review.reviewee_user_id = :hostId` isolates the actual host.
- `data/publicReviewRepository.js:43`: `review.verification_status = :verified` requires the established verified-stay state.
- `data/publicReviewRepository.js:53`: `AVG(review.overall_rating)` runs alongside `COUNT(*)` without category joins, preventing count inflation.
- `data/publicReviewRepository.js:58`: descending creation time and ID provide deterministic recent-first pages.
- `business/service/reviewService.js:57`: `const hostId = publicView ? query.hostId : userId` binds dashboard ownership to authentication.

All four queries share publication, host/type and completed-booking predicates.
Active host categories alone influence category averages. Queries select public
fields explicitly and map responses without booking IDs, guest IDs, private
feedback, verification flags or internal moderation state.

## Failure modes

| Failure | Test and handling | Visible result |
|---|---|---|
| Unauthenticated dashboard request | Real controller authentication test | 401 |
| Spoofed dashboard host or unsupported filters | Query allowlist tests | 400 |
| Invalid host ID or pagination | Validation tests | 400 before query |
| No eligible host reviews | Repository empty-result test | 200, zero count and null averages |
| Unpublished, restricted, rejected or deleted review | Real SQL predicates require published status/publication and verified stay | Excluded from every query |
| Booking reassigned or no longer eligible | SQL joins validate actual host/guest/property and completed-stay policy | Excluded |
| Property review or another host | SQL type and host isolation assertions | Excluded from totals, categories and pages |
| Database timeout | Existing controller error handler | Generic 500; no internal exception exposed |

Separate read queries may observe concurrent changes between summary and page,
matching existing property-query behavior; no snapshot consistency is promised.

## Data flow

```text
GET /reviews ▶ public host ID OR authenticated dashboard subject
  ▼
Published verified GUEST_TO_HOST + matching completed booking
  ▼
Overall AVG/COUNT + active category AVG + bounded recent page + page ratings
  ▼
Public fields only
```

## Not in scope

- Frontend, new Gateway resources and live deployment: existing resource reused.
- Property aggregation refactor: preserve its existing default and behavior.
- Host responses, notifications and private feedback: unrelated to published retrieval.
- New indexes: four fixed query operations, with aggregation performed in SQL; production query plans should guide future indexing.

## Validation

Tests use real TypeORM metadata and generated PostgreSQL SQL with mocked execution.
They cover aggregation queries, empty responses, eligibility, host/type isolation,
pagination, public projection and dashboard authorization. No live database or
deployed Gateway validation was performed.
`npm test -- --runInBand test/ReviewSystem --silent`: 39 suites, 924 tests passed.
`git diff --check` passed; 299 added/deleted lines including tests and this report.
