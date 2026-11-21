# Guest review history

Pull request: not supplied
Issue: not supplied
Reviewed commit: 6448876f6
Baseline: feat/verified-stay-indicators (84574d0b8)
Scope: current branch diff against its merged feature parent; clean working tree
at review start. No fetch or application edits performed.
Result: editability finding fixed; stale deletion test still needs an owner decision.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (10/10) | backend/functions/ReviewSystem/business/service/reviewService.js:614 at reviewed commit | History marks any review editable within the time window, including submitted, approved, published and rejected records. Actual editing accepts only unpublished drafts. Both history list and detail expose this inconsistent capability. | Fixed in working tree following owner approval: require DRAFT and UNPUBLISHED as well as the existing time window. List/detail state-matrix regression added. |
| P2 (10/10) | backend/test/ReviewSystem/reviewEntities.test.js:160 | Existing deletion test still expects the removed REJECTED update contract, while deleteOwnReview now delegates to the DELETED soft-delete query. The suite fails because its fake repository has no createQueryBuilder. | Confirmed by test run; pending separate owner decision. Recommend updating this regression to exercise the ownership-scoped DELETED write and retained supporting records. |

### Verified evidence

First finding:

Evidence below describes the reviewed commit before the correction.

- `reviewService.js:614`: `can_edit: timestamp >= Number(review.created_at) && timestamp < deadline`
- `reviewService.js:190-191`: `if (review.status !== "DRAFT" || review.publication_status !== "UNPUBLISHED") { throw new ConflictException("Only unpublished drafts can be edited."); }`
- `reviewService.js:186`: `if (!review || ["DELETED", "REJECTED"].includes(review.status)) throw new NotFoundException("Review not found.");`
- `reviewService.js:240`: the existing written-review mapper includes
  `review.status === "DRAFT" && review.publication_status === "UNPUBLISHED"`
  before the same time checks.

Second finding:

- `reviewRepository.js:499-500`: `async deleteOwnReview(id, reviewerUserId, now) { return this.softDelete(id, reviewerUserId, now); }`
- `reviewEntities.test.js:162-164`: `expect(repositories.get(Review).update).toHaveBeenCalledWith({ id: "legacy-review", reviewer_user_id: "guest-1" }, { status: "REJECTED", publication_status: "REJECTED", updated_at: 123 });`

## Four passes

- Architecture: reuses authenticated controller routing, reviewer-scoped repository
  reads and existing response/category enrichment. History includes owned rejected
  reviews and inactive/missing properties intentionally. The capability mapper
  disagrees with the existing edit boundary (first finding). No new infrastructure
  or schema is needed; deployed /reviews and /reviews/{id} routes already exist.
- Code quality: offsets and UUID detail IDs are validated; query allowlists reject
  client-supplied guest identities. Explicit DTO fields omit private feedback,
  booking/guest/host identifiers. Response enrichment filters published, nondeleted
  replies. The CSS move updates its only changed import without content changes.
- Tests: auth, spoofing, ownership SQL, offsets, UUIDs, pagination, empty histories,
  expiration and disabled policy have coverage. State tests preserve status but
  omit assertions that can_edit agrees with editing. The deletion contract changed
  without updating an existing test. Mocked SQL tests are not live DB tests.
- Performance: list reads at most eleven rows, detail one. Property, category and
  response enrichment is batched. Offset pagination can shift under concurrent
  insertion/deletion and become slower at deep offsets. No query-plan/load evidence
  was available; existing unique booking/type/reviewer index is not a history-sort
  index. No performance defect is claimed without measurement.

## What already exists

Reuse AuthManager's verified caller, existing Lambda routes, REVIEW_FIELDS,
attachPublicDetails, editDeadline, draft-only editing, ownership/version guarded
writes and softDelete. Existing written-history DTO already computes state-aware
can_edit and is the policy to follow. This branch adds backend history list/detail
contracts; it does not connect the existing GuestReviews view to the new scope.

## Failure modes

| Path / realistic failure | Handling and visibility | Test coverage |
|---|---|---|
| No verified caller or spoofed guest query | 401/400 before history data access | Auth/spoofing tests |
| Detail belongs to another guest or is deleted | SQL ownership/deleted predicates; generic 404 for no match | Ownership SQL and empty-detail tests; no live DB test |
| Invalid offset, UUID or view mode | 400 before repository access | Input tests |
| Property missing/inactive | History remains readable; property_name null if absent | Mapping inspected; no dedicated missing-property regression |
| Fresh non-draft history entry | can_edit now false; edit endpoint continues to reject it | List/detail state matrix covers draft, submitted, approved, published, rejected and inconsistent draft/published combinations |
| Expired/disabled edit policy | can_edit false, edit request rejected | Expiration/policy tests |
| Database or enrichment query fails | Existing controller generic 500; caller sees failure | No dedicated history failure-injection test; handling exists |
| New rows inserted between offset pages | Rows may shift/repeat; no snapshot guarantee | Not covered by concurrency test; retained pagination semantics |
| CSS moved but import stale | Public review component would fail to resolve style module | Targeted PublicReviews test run below |
| Legacy deletion contract test runs | Test expects REJECTED instead of new DELETED soft-delete behavior | Full backend run below |

No additional failure with simultaneously absent handling, tests and visible
symptom was identified. The can_edit mismatch is a concrete API contract defect.

## Data flow (component level)

```text
GET /reviews?scope=guest-history&offset=...
GET /reviews/{id}?view=history
                 ▼
Authenticated caller ▶ validate query/ID
                 ▼
Review SQL: reviewer + guest review type + not DELETED [+ detail ID]
                 ▼
Bounded rows ▶ batched property names + public responses + category ratings
                 ▼
History DTO + edit deadline/capability ▶ caller
                       ▲
             can_edit: unpublished draft + time window
```

## Not in scope

- New history frontend and live browser/responsiveness QA: this diff supplies the
  backend API and relocates a stylesheet; no new history UI is included.
- Cursor migration/history index tuning: retain bounded offset semantics pending
  workload/query-plan evidence; no speculative index added.
- Changing editing policy to permit published/rejected reviews: contradicts the
  existing guarded write contract; recommend correcting capability metadata.
- Inherited traveler, moderation and verified-stay changes: reviewed in their own
  records and excluded from this incremental branch diff.
- Production deployment/live database exercise: not performed in this review.

## Independent second opinion

A separate reviewer independently identified the can_edit inconsistency and the
stale deletion test, agreeing on both findings. No disagreement. They found no
additional trust-boundary issue and confirmed bounded batched enrichment.

## Validation

- `git diff --check`: passed before creating this record.
- Backend `npm test -- --runInBand test/ReviewSystem`: 18 suites passed, one
  failed; 453 tests passed, one failed. Failure: `reviewEntities.test.js`,
  `soft deletes only the author while retaining supporting records`, throws
  `TypeError: dataSource.getRepository(...).createQueryBuilder is not a function`.
  This confirms the stale deletion test finding. Guest history suite passed.
- Frontend `CI=true npm test -- --watchAll=false --runInBand
  src/features/review/tests/PublicReviews.test.js`: one suite, all ten tests
  passed. This checks the stylesheet import after relocation.
- After owner-approved editability correction,
  `npm test -- --runInBand test/ReviewSystem/guestReviewHistory.test.js`: all
  23 tests passed, including the six list/detail state combinations.
- `git diff --check`: passed. The editability fix, its regression and this review
  record remain uncommitted. No remote PR edits were made.

## Owner decision

The owner selected fixing can_edit to match the existing editing policy. History
now requires an unpublished draft and a valid time window, preserving status and
deadline fields. No editing permissions were expanded. Deferring the mismatch
was considered and not selected. The stale deletion regression remains pending
as a separate decision.

## PR checklist status

- [ ] Review performed, but findings await fixes or explicit owner decisions.
- [x] Findings recorded in this file. No remote PR description edited.
