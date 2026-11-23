# Recent property reviews, filtering and moderation

Pull request: not supplied.
Issue: not supplied.
Branch: `feat/recent-property-reviews`
Reviewed commit: `3d908db27` plus working-tree fixes (original review: `5f88664f7`)
Original review base: `origin/acceptance` (`5b6046ba2`), three-dot branch diff.
Current HEAD includes the subsequent acceptance merge; this follow-up checks the remaining P2 fix.
Result: first P2 fixed; owner deferred the malformed-response P2 to a separate PR.
Concurrent working-tree edits contain a candidate fix; those edits are not
claimed as approved or included in this PR by this checklist update.

Applied `.claude/skills/eng-review/SKILL.md`. An independent second reviewer
inspected moderation changes and confirmed both findings; no disagreement.
This record supersedes the older admin UI review for current coverage and scope.
Follow-up implementation reviewed as an uncommitted diff on `5f88664f7`.

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `frontend/web/src/features/review/views/ReviewApprovalPage.js:148` | Search and rating controls affected only ordinary review rows. | Fixed in working tree: owner chose full moderation filtering. UI passes search/rating; backend validates and filters before pagination. Tests cover combined filters, pagination reset and resolved-status preservation. |
| P2 (8/10) | `frontend/web/src/features/review/components/ReviewModerationQueue.js:51` | A malformed successful queue response crashes rendering instead of offering retry. | Fixed in working tree: GET moderation validates the flags array, rejects null/non-object entries and requires a null or nonnegative safe-integer continuation offset. Regression covers error display and successful retry. |

### Verified evidence

First finding:

- `ReviewApprovalPage.js:148`: `<div className={styles.toolbar}>` is unconditional.
- `ReviewApprovalPage.js:156`: `onChange={changeFilter(setQuery)}`
- `ReviewApprovalPage.js:171`: `<select id="review-rating" value={rating} onChange={changeFilter(setRating)}>`
- `ReviewApprovalPage.js:216`: `<ReviewModerationQueue />`
- `ReviewModerationQueue.js:23`: `getReviewFlags({ status, offset, limit: PAGE_SIZE }).then((page) => {`

At reviewed commit, the moderation request received neither search nor rating.
The evidence above describes that original defect. The follow-up connects these
controls to the queue API; the second reviewer found no new concrete blocking
defect in that implementation.

Second finding:

- `services/reviewAPI.js:45`: `return payload;` after checking only HTTP status.
- `ReviewModerationQueue.js:24`: `if (active) setResult(page);`
- `ReviewModerationQueue.js:51`: `const selected = result?.flags.find((flag) => flag.id === selectedId) ??`
- `ReviewModerationQueue.js:89`: `{result?.flags.length === 0 && <p className={styles.emptyState}>No {status.toLowerCase()} review flags.</p>}`

For HTTP 200 `{}`, `result` exists but `flags` does not. Reading `.find` throws
during render, beyond the request catch. The server currently returns the expected
shape; the failure concerns contract drift. Both findings now have regression coverage; see the validation follow-up below.

## Four passes

- Architecture: reuses the public review endpoint, repository eligibility predicate,
  authenticated moderation transport, and approver authorization. Public output
  projects allowed fields; moderation details remain behind authorization. Recent
  ordering uses date/ID keyset pagination; rating sorts retain offset pagination.
- Code quality: filter validation rejects unsupported keys, invalid ranges/dates,
  foreign-property cursors and mixed cursor/offset requests. Property-keyed remounts
  reset filters and pagination; request cleanup suppresses obsolete results.
  Moderation filtering now validates search length/control characters and rating
  values. The malformed-response finding is also fixed at the API boundary.
- Tests: inspected public query validation, SQL construction, cursor continuation,
  UI filter/reset/pagination, stale requests, public rendering, pending-flag holds,
  duplicate flag rejection and resolve/approve workflows. Mocked SQL tests verify
  construction, not actual database execution or production query plans.
- Performance: public pages fetch at most eleven rows and batch category/response
  reads. Moderation metadata uses batched queries, not one lookup per review.
  Public requests add a filtered count alongside the unfiltered score query;
  both still scan eligible property reviews. Moderation literal substring search
  adds three primary-key left joins and remains bounded in returned rows, but may
  scan many flags. No production benchmark was run.

## What already exists

Reuse `eligibleReviewQuery`, `requestReview`, response parsing, token acquisition,
review cards, queue tabs, approval/version checks and transactional pending-flag
holds. The listing import follows the moved public component. No new dependency,
schema migration or deployment mechanism is introduced in this diff.

## Failure modes

| Path / realistic failure | Handling and user visibility | Test coverage |
|---|---|---|
| Public filters have invalid ranges/dates or cursor | Backend 400; UI alert and retry/clear controls | Backend invalid-input tests; UI request-error/retry test |
| Property changes while public request is pending | Keyed remount and abort cleanup prevent stale results | PublicReviews property-switch test |
| No filtered matches | Matching count and explicit empty message; overall score retained | Backend and UI zero-match tests |
| Recent page has tied dates or another page | ID tie-breaker and extra row generate continuation cursor | Cursor encoding, ordering, bounds and SQL tests; no live DB test |
| Public request fails | Alert and Retry | API rejection and component retry tests |
| Duplicate flag submission | Dialog alert; another attempt allowed | ReviewFlagging regression |
| Resolution fails | Alert, row retained, controls unlocked | ReviewFlagging regression |
| Approval attempted with pending flag | UI suppresses approval; backend transactional hold | UI and backend flagging tests |
| Moderation load rejects | Alert and Retry | No dedicated new load-retry regression identified |
| Successful moderation response is malformed | API rejects invalid payload; queue displays alert and Retry | New malformed-response and retry regression |
| Moderation search/rating selected | API filters before pagination; resets page while keeping Pending/Resolved | New UI regression and backend generated-SQL/validation assertions |

No additional critical gap (no test, no handling and no visible symptom) was
identified. Browser modal focus and actual deployment behavior remain unverified.

## Data flow (component level)

```text
Listing property ID + filters
           ▼
PublicReviews ▶ GET property reviews ▶ validate filters/cursor
           ▲                              ▼
           └──── score + matching count + bounded page
                          ▼
                  review cards + pagination

Admin details ▶ flag dialog ▶ authenticated moderation POST
                                      ▼
                            queue GET + batched details
                                      ▼
                         resolve PATCH ▶ approve POST

Search/rating toolbar ▶ ordinary review rows
         └────────────▶ moderation GET search/rating ▶ filtered flags page
```

## Not in scope

- Production SQL plans/index tuning: no representative database or load evidence;
  bounded page reads do not guarantee cheap aggregate counts.
- Rating-sort and moderation offset pagination under concurrent changes: retain
  existing semantics; rows can shift between requests. Recent keyset pages avoid
  offset shifts but are not a snapshot when review eligibility changes.
- Endpoint provisioning, database deployment and live browser/responsive/modal QA:
  this is a source/test review, with no deployment or browser claim.
- Unrelated changes already on acceptance: outside the agreed branch diff.
- Full moderation row schema validation: deferred; this fix validates collection entries and pagination needed to prevent the reported crash, without introducing a schema library.

## Filtering decision

Context: the owner selected implementing moderation search/rating filtering over
hiding controls or accepting inactive controls. Choice: server-side filtering
before pagination, reusing the existing authenticated moderation endpoint.
Search matches guest name (only when booking guest matches reviewer), property
title, reservation ID, review title, city and country, using case-insensitive
literal substring matching. Rating uses FLOOR, matching existing star bands.
Consequences: additional joins for search and a 255-character input limit; no
new dependencies. Primary-key joins preserve one row per flag. Status remains
selected when filters reset pagination; obsolete requests cannot replace results.
SQL assertions do not replace a live PostgreSQL/search-performance check.

## Validation

- Backend: `npm test -- --runInBand test/ReviewSystem`: 17 suites, 422 tests passed.
- Listing integration: `CI=true npm test -- --watchAll=false --runInBand --silent src/features/bookingengine/listingdetails/pages/listingDetails2.test.js`: one suite, 13 tests passed.
- Frontend review: `CI=true npm test -- --watchAll=false --runInBand src/features/review src/features/listingdetails/pages/listingDetails2.test.js` reported passing suites including PublicReviews, ReviewFlagging, ReviewApprovalPage and publicReviewsAPI, but stopped producing output without a final summary. Attempted interruption; overall run is unverified. The listing path in this combined command did not match the integration file, so the correct integration path was run separately above. React act/defaultProps warnings appeared in other passing review suites.
- Follow-up backend: `npm test -- --runInBand test/ReviewSystem/reviewFlagging.test.js`: one suite/test passed, including expanded validation and generated SQL checks.
- Follow-up frontend: `CI=true npm test -- --watchAll=false --runInBand --silent src/features/review/tests/ReviewApprovalPage.test.js src/features/review/tests/ReviewFlagging.test.js`: two suites, 25 tests passed. An initial test-only heading selector was corrected to await the loaded tab before this passing rerun.
- `git diff --check` passed. Application filtering changes, tests and this review record remain uncommitted.

## PR checklist status

- [x] Review ran: first finding fixed; remaining P2 explicitly deferred by owner
  to a separate PR, accepting the known malformed-response risk for this PR.
- [x] Findings and decisions recorded: yes; link this file for the second
  checkbox. No remote PR description was edited.

## Malformed-response follow-up (2026-11-20)

A concurrent workspace update recorded a candidate fix for the remaining P2.
The owner subsequently instructed that the fix belongs in another PR. `getReviewFlags` now rejects malformed
successful responses before they reach component state. The existing request
catch displays a clear alert and Retry; a subsequent valid response recovers
the queue. POST/PATCH moderation behavior is unchanged. No dependencies added.
Tests exercise the real API wrapper and queue together with mocked transport.

Validation: targeted frontend run passed all 4 suites and 76 tests:
`moderationResponse.test.js`, `ReviewFlagging.test.js`,
`reviewApprovalAPI.test.js`, and `ReviewApprovalPage.test.js`.
`git diff --check` passed. Fix and updated record remain uncommitted.

## Owner deferral decision (2026-11-20)

The owner instructed: "Do not fix, I will do the fix in another PR."
The malformed-response P2 is deferred and its risk accepted for this PR only.
A candidate fix and test appeared concurrently in the workspace; they were left
untouched. This documentation update does not approve their inclusion in this PR.
No production code or tests were changed by this checklist update.
Checklist verification was performed at `3d908db27` with the existing staged
changes; the validation results above describe prior runs, not a new full review
or test run after the acceptance merge.
