# Guest to host reviews

Pull request: not opened
Issue: supplied user story
Reviewed commit: f488836a2 plus working tree changes
Result: no blocking findings; independent second review agreed.

## Findings and decisions

No blocking findings across architecture, code quality, tests and performance.

- `reviewService.js:528`: `!GUEST_REVIEW_TYPES.includes(current.review_type)` shares moderation eligibility across both guest review types.
- `reviewService.js:657`: host reviews use the established `VERIFIED_STAY` state after the existing completed-stay check; property creation retains `UNVERIFIED`.
- `reviewRepository.js:373,382`: bounded moderation queues include both types. Public property queries and aggregates retain their property type filters.
- Existing identity-spoofing test now supplies a supported type. Unsupported types are explicitly rejected rather than silently converted to property reviews.
- Independent reviewer recommended host approval/publication and stale-booking coverage; added both.

## What already exists

Reuse `review`, `review_rating`, `review_category`, transactional persistence,
type-scoped active categories, completed-booking checks, moderation transitions,
and the unique `(booking_id, review_type, reviewer_user_id)` index.
Only category configuration needs a migration. Seed both `test` and `main`,
preserve existing operator configuration and use a non-destructive rollback.

## Failure modes

| Failure | Test and handling | Visible result |
|---|---|---|
| Missing booking or wrong guest | Creation tests; existing exceptions | 404 or 403 |
| Cancelled or unfinished stay | Creation and submission tests; booking policy | 400 |
| Concurrent duplicate | Unique-index error translation test | 409 |
| Wrong type or inactive category | Configuration eligibility tests | 400 |
| Booking reassigned before submission | Host publication tests; existing transaction recheck retained | 403 or 409 |
| Seed not applied | Unsupported category handling; seed SQL test | 400 for unconfigured categories |
| Persistence or publication write failure | Existing transaction rollback tests retained | Existing error response; no partial transaction |

## Data flow

```text
Authenticated guest
  ▼
Completed booking ▶ supported type ▶ active category configuration
  ▼
Existing review / review_rating / review_request transaction
  ▼
DRAFT ▶ PENDING_APPROVAL ▶ APPROVED ▶ PUBLISHED
```

## Not in scope

- Host notifications and responses: existing alert rules (`reviewAlertRules.js:85,108`) and response queries remain property-specific; these capabilities were not requested.
- Frontend, API Gateway and host public feeds: backend domain extension only.
- New tables or uniqueness changes: existing schema already supports independent types.
- Broad booking-policy or verification refactors: preserve property review behavior.

## Validation

Jest covers host types, rating boundaries, configured categories, authenticated
ownership, completed stays, duplicates, coexistence in either creation order,
submission, staff approval/publication and category migration SQL.
Repository tests exercise category lookup and transactional persistence for both types.
`npm test -- --runInBand test/ReviewSystem --silent`: 37 suites, 868 tests passed.
`git diff --check` passed; total change is 245 added/deleted lines including this record.
No live database migration was executed.
