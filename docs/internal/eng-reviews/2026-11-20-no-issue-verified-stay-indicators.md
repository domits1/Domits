# Verified stay indicators and inherited review changes

Pull request: not supplied
Issue: not supplied
Reviewed commit: fa76a6b5a
Baseline: local origin/acceptance (539f763fa); no fetch performed for this review
Scope: entire current branch diff, including inherited traveler and moderation changes
Result: one P1 fixed in the working tree following the owner's decision; validation below.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | backend/functions/ReviewSystem/data/publicReviewRepository.js:50 at reviewed commit | The public feed required stored VERIFIED, but normal creation and publication retain UNVERIFIED. Completed, approved, published reviews disappeared from the page, count and score. Legacy VERIFIED_STAY reviews were excluded too. | Fixed in working tree: owner chose removing the exact stored-status restriction and deriving stay verification from matching completed-booking evidence. Publication and booking checks remain required. |

### Verified evidence

These quotes describe the reviewed commit before the correction.

- `backend/functions/ReviewSystem/data/publicReviewRepository.js:50`:
  `.andWhere("review.verification_status = :verificationStatus", { verificationStatus: "VERIFIED" }),`
- `backend/functions/ReviewSystem/business/service/reviewService.js:530`:
  `verification_status: "UNVERIFIED",`
- `backend/functions/ReviewSystem/business/service/reviewService.js:419`:
  `|| !["UNVERIFIED", "VERIFIED", "VERIFIED_STAY"].includes(current.verification_status)) {`
  Moderation explicitly permits all three states.
- `backend/functions/ReviewSystem/data/reviewRepository.js:602-606`:
  `const updates = { status: to, publication_status: to === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED", updated_at: timestamp };`
  Publication leaves verification unchanged.
- `backend/test/ReviewSystem/reviewEntities.test.js:572`:
  `it("publishes and completes the matching request in one transaction without upgrading verification", async () => {`
- `backend/test/ReviewSystem/reviewEntities.test.js:576`:
  `expect(result).toMatchObject({ status: "PUBLISHED", publication_status: "PUBLISHED", verification_status: "UNVERIFIED" });`

This is a boundary mismatch between moderation verification state and evidence of
a completed reservation. The query applies the restriction to all three public
reads, so the failure appears as ordinary empty results rather than an error.

## Four passes

- Architecture: publication, verification state and reservation evidence are
  separate concepts. The new exact verification predicate conflicts with the
  existing publication contract; the correction removes that predicate. Public output otherwise projects allowed fields;
  moderation endpoints reuse authentication and approver checks.
- Code quality: completed-stay policy is shared between submission and public SQL;
  filters and cursors are validated. Property-keyed remounts and abort guards
  suppress obsolete results. Moderation search precedes pagination and metadata
  reads are batched. Earlier recorded search and malformed-response defects are
  fixed in this tree.
- Tests: policy, SQL construction, cursor boundaries, public filters, badge
  rendering and moderation failure paths have coverage. Missing integration:
  creating an ordinary review, approving/publishing it, then reading the public
  feed. Original mocks supplied VERIFIED rows and did not expose the P1 mismatch.
  Regression coverage now exercises all three stored verification states and
  independently generates SQL for score, count and page, proving each retains
  completed-booking/publication predicates without a stored-verification gate.
  This does not replace an actual database end-to-end test.
- Performance: public page reads are bounded to eleven rows, with batched category
  and response reads. Score/count/page each repeat booking eligibility joins;
  aggregates and substring moderation search may scan many rows. No production
  SQL plans or load measurements were available.

## What already exists

Reuse `eligibleReviewQuery`, review publication transactions/version checks,
completed-booking assertions, authenticated moderation transport, public cards,
and abort-aware public requests. No new dependency or schema migration is needed
for the correction. Publication intentionally preserves verification.

## Failure modes

| Path / failure | Handling and visibility | Coverage |
|---|---|---|
| Normal published review remains UNVERIFIED | Included when published and linked to an eligible completed booking; badge derives from that evidence | Stored-state API regression and independent score/count/page SQL regression added. Original critical gap fixed at query boundary; live create-to-public integration remains unverified. |
| Booking missing, guest/property mismatch, future checkout, invalid status | Query excludes row; submission rejects ineligible booking | SQL join/predicate assertions and completedStayError cases; no live DB execution |
| Invalid filters/cursor | Backend 400; public UI alert and Retry/clear controls | Input and cursor validation tests |
| Public request fails or property changes mid-request | Alert/Retry; keyed remount and abort guard prevent stale results | PublicReviews tests |
| No matches or equal-date pagination boundary | Empty message; stable date/ID keyset cursor | Count/score and cursor construction tests; no DB concurrency test |
| Badge receives false/missing value | Badge hidden; only strict true is shown | VerifiedStayIndicator tests |
| Duplicate flag, resolution or approval failure | Alert, guarded mutations, retries/version checks | ReviewFlagging and ReviewApprovalPage tests |
| Malformed successful moderation response | API rejects shape before render; alert and Retry | moderationResponse tests |

## Data flow (component level)

```text
Guest + completed booking
          ▼
Create UNVERIFIED draft ▶ submit ▶ approve ▶ publish (still UNVERIFIED)
                                                ▼
Public query: published + matching completed booking
                                                ▼
                         review + verified-stay badge

Public filters/cursor ▶ validate ▶ score + count + page ▶ cards/badge
Admin token/role ▶ moderation queue ▶ resolve flag ▶ approve/publish
```

## Not in scope

- Changing publication to auto-upgrade verification: contradicts an explicitly
  tested contract; recommend preserving it and using reservation evidence.
- Optional P3 UI polish: flagged APPROVED rows still offer Publish in
  `ReviewApprovalTable.js:97` and `ReviewApprovalDetails.js:113`. Backend
  `reviewRepository.js:591-594` rejects publication, so integrity is protected.
  Deferred from the blocking policy decision.
- Live database plans, deployment and browser/modal-focus QA: unavailable in this
  source/test review; no production or browser validation claimed.
- Unrelated acceptance changes: outside the agreed branch diff.

## Independent second opinion

A separate reviewer inspected frontend behavior and independently verified the
backend P1 against creation, publication and the preservation test. Both reviewers
agree on the P1 and recommend deriving verification from booking evidence. No
disagreement. The second reviewer identified the optional Publish-action polish
above; it is not an authorization bypass. A follow-up independent review of the
correction and tests found no new issues and confirmed that all three queries
retain the booking and publication checks.

## Validation

- `git diff --check`: passed before adding this record.
- Backend `npm test -- --runInBand test/ReviewSystem`: 17 suites passed, one
  failed; 429 tests passed, one failed. Runtime/deployment preflight fresh-Node
  import exceeded its 20-second subprocess timeout (`reviewEntities.test.js:37`).
- Isolated backend recheck of `loads the real handler`: passed (one test, 39
  skipped), including the fresh-process import. The earlier timeout did not
  reproduce; the complete backend run still had the timeout recorded above.
- Frontend `CI=true npm test -- --watchAll=false --runInBand src/features/review`:
  21 suites reported PASS, including PublicReviews, ReviewFlagging,
  moderationResponse and publicReviewsAPI. ReviewApprovalPage reported a
  five-second timeout in `flags a review, resolves it from the moderation queue
  and views resolved flags`. The run then stopped producing output and was
  interrupted without a final summary. Full frontend validation is incomplete.
- Isolated frontend recheck of `flags a review, resolves it`: passed (one test,
  21 skipped). The earlier timeout did not reproduce; the complete frontend run
  remains incomplete.
- After the approved correction, `npm test -- --runInBand test/ReviewSystem`:
  all 18 suites and 433 tests passed, including the runtime preflight and the
  new regression coverage. No frontend application code changed in this fix;
  the earlier frontend validation limitations above still apply.
- Final `git diff --check`: passed. Changes are the query correction, two backend
  test files and this review record; no commit or remote PR update was made.

## Owner decision and correction

The owner selected: "Remove stored VERIFIED requirement; use completed-booking
evidence (recommended)". The query now uses the same matching reservation, guest,
property, paid/confirmed status and passed checkout checks for score, count and
page, alongside published review and active property constraints. Stored
verification is unchanged. The public badge continues to reflect reservation
evidence, rather than an automatic moderation-state upgrade.

Alternatives considered: add a separate workflow to upgrade stored verification,
or accept/defer missing public reviews. Neither was selected. Consequence: a
published UNVERIFIED or VERIFIED_STAY record is visible only while its linked
reservation satisfies the evidence checks. No migration or deployment step added.

## Checklist status

- [x] Engineering review ran; the P1 is fixed following the owner's decision.
- [x] Findings recorded in this file. No remote PR description was edited.
