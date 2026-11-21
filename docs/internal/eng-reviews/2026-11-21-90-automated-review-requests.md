# Automated review requests

Pull request: #3646
Issue: #90
Reviewed commit: 09e06666b
Baseline: merged fix/guest-review-history-ui (bec620ffcb61df0c87ee98cc30d12db210073fff)
Result: one P2 fixed in working tree following owner decision.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (10/10) | backend/functions/ReviewSystem/business/service/reviewRequestNotifier.js:32 at reviewed commit | Missing FRONTEND_URL sent invitations to localhost, despite deployment documentation promising a production default. Successful email acknowledgement then permanently marked the request SENT, with no automatic retry. | Fixed in working tree: owner selected https://domits.com default with explicit FRONTEND_URL override retained. Regression covers missing/empty configuration, acceptance and local overrides, and encoded booking IDs. |

Verified evidence at reviewed commit (before correction):

- `reviewRequestNotifier.js:32`: `const url = new URL("/review", process.env.FRONTEND_URL || "http://localhost:3000");`
- `backend/infrastructure/review-requests/README.md:5`: `Configure FRONTEND_URL on ReviewSystem for acceptance; it defaults to https://domits.com.`
- `backend/infrastructure/review-requests/template.yaml:13-14`: `ScheduleExpression: rate(15 minutes)` and `State: ENABLED`. The stack references an existing Lambda and does not configure its frontend URL.
- `reviewService.js:210-211`: `await this.notifier.send(booking);` then `status = "SENT";`.
- `reviewRepository.js:244`: candidate selection accepts only an absent request or an unsent, unclaimed OPEN request; SENT is not retried.

## Four passes

- Architecture: new EventBridge schedule reuses ReviewSystem, review_request,
  existing user-lookup/email Lambdas and publication completion. Atomic claims
  permit one attempt, not guaranteed delivery. The configuration/documentation
  disagreement is the finding above. No new public HTTP sending endpoint added.
- Code quality: fresh booking identity/status/checkout and existing-review checks
  precede delivery; lookup/email envelopes and numeric 2xx replies are validated.
  Uncertain outcomes retain claims and emit structured, content-free diagnostics.
  Delivery acknowledgement does not overwrite concurrent completion.
- Tests: mocked transport plus real TypeORM SQL construction cover claims,
  candidate cutoffs, competing workers, failure codes, acknowledgement errors,
  continuation and completion races. Tests check the link path but miss its
  default origin. Login-return/MFA behavior has dedicated tests.
- Performance: candidate batch is bounded to fifty bookings; enrichment/delivery
  proceeds sequentially, with two synchronous Lambda calls per actual send.
  No remaining-time budget or production latency/SQL-plan validation was run.
  Timeout leaves claims for manual reconciliation by design; actual deployed
  Lambda timeout/capacity must be checked before enabling the schedule.

## What already exists

Reuse completedStayError/applyCompletedStayConditions, unique request identity,
review submission ownership, existing email transport, authentication/MFA and
publication transactions. safeReviewDestination restricts login return navigation
to same-origin review paths with a booking/reservation/review ID. The login merge
preserves admin landing and review return behavior. No package change introduced.

## Failure modes

| Path / failure | Handling and visibility | Coverage |
|---|---|---|
| Missing frontend URL | Now defaults to production origin; explicit acceptance/local configuration still honored | Four origin regression cases added; P2 fixed |
| Missing/invalid rollout timestamp | Selection fails closed; scheduler receives error | Invalid config and cutoff tests |
| Cancelled/future/malformed/mismatched booking | Fresh check cancels claim; no email | Eligibility/identity tests |
| Existing review or competing worker | Existing-review exclusion or conditional claim prevents send | Service checks and mocked competing SQL writes |
| Missing email, dependency function/transport/non-2xx/invalid reply | FAILED, structured diagnostic, no automatic resend | Notifier/service failure tests |
| Claim or acknowledgement fails | Batch continues with RECONCILIATION_REQUIRED; retained claim prevents duplicate attempt | Failure/continuation tests |
| Publication during delivery | COMPLETED retained; sent timestamp may still be attached | Completion race test |
| Invocation times out/crashes | SENDING persists; operator must inspect reconciliation query and email logs | Documented; no real runtime/crash test |
| Guest must sign in or complete MFA | Safe review destination retained; unsafe destinations rejected | Review-return and MFA tests |

No additional critical gap with absent tests, handling and visible symptom was
identified. At-most-once attempts deliberately accept possible missed delivery.

## Data flow (component level)

```text
EventBridge (15 minutes) ▶ ReviewSystem scheduler
                              ▼
completed bookings + rollout/cutoff + no review/request sent
                              ▼
OPEN ▶ conditional claim ▶ SENDING ▶ fresh booking/review check
                                      ▼
                               GetUserInfo ▶ email Lambda
                                      ▼
                          SENT / FAILED / CANCELLED
                                      ▲
publication ▶ COMPLETED (claim retained; acknowledgement preserves completion)

email review link ▶ ReviewPage ▶ login/MFA ▶ safe review return
```

## Not in scope

- Automatic retries/reminders: deliberately excluded to prevent duplicate emails
  after uncertain delivery; operators reconcile before any authorized retry.
- Deployment, real emails, live database concurrency, capacity/timeout tuning:
  not performed; mocks do not establish production delivery or SQL performance.
- Inherited history/UI changes and their prior reviews: outside incremental diff.
- Local email test JSON artifacts: reviewed as test inputs/responses, not evidence
  of successful production delivery. They contain a personal recipient address;
  no credential is present and this review did not send email.

## Independent second opinion

Separate reviewer confirmed the URL-default P2 and claim/completion reasoning.
No disagreements or additional verified backend findings. Dependency Lambda
implementations are outside this repository; existing callers corroborate their
request/response envelopes, but deployed behavior was not exercised.

## Validation

- Backend `npm test -- --runInBand test/ReviewSystem`: 20 suites, 492 tests passed.
- Earlier conflict-resolution checks on the same application tree: login admin/MFA
  suites 23 passed, 4 skipped; review-return suite 12 passed. These were run before
  the merge commit, not repeated during this review.
- ReviewPage frontend regression: one suite, all 48 tests passed.
- After URL correction: automatedReviewRequests suite, all 35 tests passed,
  including four default/override URL cases. Full backend result above predates
  this one-line correction; only the affected suite was rerun afterward.
- `git diff --check`: passed before adding record. No infrastructure deployed.

## Checklist

- [x] Review completed; P2 fixed following explicit owner decision.
- [x] Findings and decisions recorded here; no remote PR edit made yet.

## Owner decision and correction

Owner selected: "Default to https://domits.com, retain explicit override".
The notifier default now matches the README. Missing or empty FRONTEND_URL uses
production; an explicit acceptance or local URL retains existing override
semantics. Requiring mandatory configuration or deferring the broken default was
considered and not selected. No claim/delivery/retry policy changed, infrastructure
deployed or real email sent. Changes remain uncommitted.
