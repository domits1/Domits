# #3099 Grant the Elite website plan with an end date

Pull request: this one
Issue: #3099
Reviewed commits: 802cbe37d, 19e86e55e, 95e6eacdc, fc4db5bbe and 11185e530, each as a staged diff before its commit, then the whole branch against `acceptance` with a second, independent review
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | directBookingWebsiteRatePlanRepository.js:30 and :41 | Every test store held rows of one host only, so dropping the account condition of the read or of the update passed every test. | Fixed before 802cbe37d: the main test also holds a paid row of another host and asserts that it stays unchanged. |
| P2 (8/10) | directBookingWebsiteRatePlanRepository.js:42 | No test pinned the status condition of the update. Without it the host's history rows would get a new end date and `updated_at`. | Fixed in 11185e530: the main test holds a `CANCELLED` row and asserts that it stays unchanged. |
| P2 (8/10) | websitePlanGrantRequest.js:6 | An end date with more than three fraction digits, valid ISO 8601, was refused. | Fixed in fc4db5bbe. |
| P2 (6/10) | support/ratePlanGrantStore.js | The fake reported a race on the current-plan unique index only as `40001`, while DSQL can answer that race with `23505`. | Fixed before 802cbe37d: a race test where the loser gets `23505` and answers `conflict`. |
| P3 (7/10) | websitePlanGrantRequest.js:35 | `grantElite(null)` threw a `TypeError` instead of a 400. | Fixed in fc4db5bbe. |
| P3 (6/10) | directBookingWebsiteRatePlanRepository.grant.test.js | No test raced a grant against a paid activation. | Fixed in 11185e530: the real `activatePaidPlan` races the grant, and the grant's retry refuses with `paid_plan_active`. |
| P3 (6/10) | directBookingWebsiteRatePlanService.js:239 | `requireHostAccount` is public but only `grantElite` uses it. | Accepted, it follows the style of the class. |

## Not in scope

- The admin route and the admin check: the next pull request, which takes the actor from the token (`user.Username`, the same id the self-grant check compares).
- Revoke and lookup of a grant: a later pull request.
- `getCurrentPlan` does not handle `40001` on its own Essentials insert: existing behaviour, unchanged here.
- Plan deviation, by decision: a DSQL commit conflict re-runs the grant (`withDsqlRetry`, as `transitionStatusWithEvent`) instead of answering 409 at once. Two grants at the same moment both succeed, both are recorded, the later one holds.
- Reason and account id lengths count UTF-16 units, not Unicode characters.

## Mutation check

37 mutants on the new guards and branches, 36 caught. The survivor drops `text.length > 0` in `readText`, which is equivalent: every caller already refuses an empty result.
