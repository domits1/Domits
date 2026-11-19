# Admin review list API: feedback follow-up

Branch: `feat/admin-review-list-api`
Reviewed base commit: `062c3ce5f`, with local feedback changes
Source: two reviewer comments supplied in chat on 2026-11-11

## Findings and decisions

| Finding | Resolution |
|---|---|
| Redundant booking-name comment in `addModerationDetails` | Removed; `bookedByReviewer` expresses the condition. |
| Missing pending submission retry coverage | Added a controller test asserting the author receives the pending status and original version, with no `publishDraft` or booking lookup. The response also excludes private fields. |
| A retry must not swallow an approval | The existing role/access test already asserts `PENDING_APPROVAL` to `APPROVED`. Added an approver-author case exercising both actions. |
| Approver is also the author | Preserved current policy: submission retry returns the pending review; explicit approval is allowed when the caller passes the allowlist and active-role checks. No new separation-of-duties rule is introduced. |
| Missing engineering review record | This file records the supplied feedback and its disposition. |
| Admin lists stop at 100 without pagination | Accepted for this change; follow-up: add cursor pagination to the admin list scopes so older reviews remain reachable, with tests across more than 100 reviews and stable ordering for equal timestamps. |

## Verification

Passed `npm test -- --runInBand test/ReviewSystem` from `backend`: 16 suites, 381 tests. `git diff --check` also passed.

Existing coverage checks approver authorization before list queries, private-field exclusion, booking-name ownership, batched detail lookups, and empty-list lookup skipping. No routes, columns, or production state-transition behavior change in this feedback follow-up.
