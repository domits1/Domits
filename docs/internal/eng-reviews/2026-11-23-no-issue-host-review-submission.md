# Host review submission API

Pull request: not opened
Issue: supplied host review submission user story
Reviewed commit: 9b470fbe7 plus working tree changes
Result: no blocking findings; independent second review agreed.

## What already exists

The preceding domain change already implements this submission story:

- `functions/ReviewSystem/index.js:15`: `["POST", "createReview"]` uses the existing `/reviews` resource.
- `controller/controller.js:99`: `this.service.createReview(userId, parseBody(event))` passes authenticated identity and parsed input.
- `auth/authManager.js:5`: `event.requestContext?.authorizer?.claims?.sub` supplies identity, rather than request ownership fields.
- `business/service/reviewService.js:632`: `review_type: reviewType` scopes duplicate detection independently from property reviews.
- `business/service/reviewService.js:650`: `host_id: booking.hostid` resolves the host from persisted booking data.
- `business/service/reviewService.js:659`: `status: "DRAFT"` prevents automatic publication.
- `data/reviewRepository.js:168`: `return runTransaction(async (manager) => {` groups review, rating and request writes.

Paths above are relative to `backend/`. Existing type validation, completed-stay
checks, category configuration, rating/text validation and database uniqueness
already support host submission. Reuse them without adding another production path.

## Findings and decisions

No blocking findings in architecture, code quality, tests or performance.
Add regression coverage through the actual Lambda handler, controller,
authentication and service, mocking only repository persistence.
This verifies HTTP responses and request routing beyond the existing domain tests.
No new queries, dependencies, schema changes or API Gateway resources are needed.

## Failure modes

| Failure | Test and handling | Caller sees |
|---|---|---|
| Missing verified identity or spoofed ownership | Real authentication and booking checks tested | 401 or 403 |
| Missing booking | Missing-booking test and existing exception | 404 |
| Cancelled stay or future/missing checkout | Eligibility tests and existing policy | 400 |
| Invalid text, rating, type or category | Payload tests and existing validation | 400 |
| Category disabled by configuration | Empty active-category test | 400 |
| Duplicate or concurrent insert | Lookup and unique-constraint error tests | 409 |
| Client requests published state or another host | Successful submission asserts persisted identities and draft state | 201 with actual host and unpublished draft |
| Malformed JSON | Real controller parsing test | 400 before booking access |

Existing repository tests retain coverage of transactional entity persistence
and rollback; the new API tests do not claim to exercise a live database.

## Data flow

```text
POST /reviews with review_type=GUEST_TO_HOST
  ▼
Verified authorizer guest ▶ JSON validation ▶ completed booking ownership
  ▼
Type-scoped duplicate and category checks
  ▼
Existing Review / Review_Rating transaction ▶ 201 DRAFT / UNPUBLISHED
```

## Not in scope

- Frontend and API Gateway: existing submission endpoint is sufficient.
- Category migration: supplied by the preceding domain change; no additional migration needed.
- Automatic publication, host feeds, notifications and responses: outside submission requirements.
- Rewriting production submission code: existing behavior already satisfies the story.

## Validation

New handler-level suite: 28 tests passed, including property submission defaults
and coexistence, host submission, authorization, duplicates and moderation state.
Full `npm test -- --runInBand test/ReviewSystem --silent`: 38 suites and 896 tests passed.
`git diff --check` passed. No live database or deployed endpoint was changed.
