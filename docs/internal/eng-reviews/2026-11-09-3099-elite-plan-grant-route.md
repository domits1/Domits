# #3099 Add the admin route that grants the Elite website plan

Pull request: this one
Issue: #3099
Reviewed commits: bf0cf90b2, 43b8287ed, 194cb2291, a1cf16ab1 and this docs commit, each as a staged diff before its commit, then the branch on top of `elite-plan-grant-service` (#3814) with a second, independent review
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | auth/authManager.js:12 | A token that Cognito refuses as a malformed parameter (`InvalidParameterException`, for example a value with a `Bearer ` prefix) is not in `REJECTED_TOKEN_ERRORS`, so the grant answers `500` instead of `401`. Nothing is written. | Not changed here: adding it to that list changes the answer of every existing route that reads a token, from `500` to `401`. Left as a question. The runbook says to send the token as it is. |
| P3 (9/10) | propertyController.websitePlanGrant.test.js | No test pinned that only `accountId`, `effectiveUntil` and `reason` reach the service; `grantElite({ ...body, actorId })` passed every test. | Fixed in a1cf16ab1. |
| P3 (8/10) | propertyController.websitePlanGrant.test.js | The 503 test checked only the keys of the body, so a raw message would have passed. | Fixed in a1cf16ab1. |
| P3 (7/10) | propertyController.websitePlanGrant.test.js | The expired and the invalid token cases threw the same Cognito message. | Fixed in a1cf16ab1. |
| P3 (8/10) | index.js:92 and :213 | The `404` for PATCH and DELETE on the grant path is plain text without `no-store`, while the runbook said every answer is JSON with `no-store`. | The runbook now says this of the POST only. Those methods do not exist in API Gateway. |
| P3 (8/10) | direct_booking_website_elite_grant.md | "Granting again answers `extended`" holds only when the first grant went in. | Reworded in this commit. |
| P3 (8/10) | propertyController.js:3983 | `console.error(error)` logs a failed database write with its query values, so the reason can reach the error log; the runbook said it stays in the audit row only. | Runbook reworded in this commit: no personal details in the reason. |
| P3 (5/10) | direct_booking_website_elite_grant.md, step 5 | The OPTIONS copy takes the templates and parameters, not `contentHandling`. | Step 3 now stops when the parent OPTIONS integration has content handling. |
| P3 (6/10) | direct_booking_website_elite_grant.md, check | `GET /property/website/rate-plan` creates an Essentials row for a host without one. | Fixed in 194cb2291: use a host who already has a plan. |
| P3 (5/10) | direct_booking_website_elite_grant.md:5 | "API Gateway answers `403 Missing Authentication Token`" could not be verified. | Fixed in 194cb2291: the text now says only that no method exists. |
| P3 (9/10) | propertyController.js:64 | `websitePlanAdminResponseHeaders` equals `reviewReadResponseHeaders` at :63. | Accepted, the name carries the intent for the revoke and lookup routes. |
| P3 (6/10) | propertyController.js:3983 | Expected `401` and `403` refusals are logged as errors. | Accepted, the same as `reviewProperty`. |
| P3 (6/10) | index.js:92 and :213 | The same guard in two handlers. | Accepted until the revoke route adds a second path; then one set of admin paths. |
| P3 (5/10) | propertyController.js:3989 | Any error with a status code shows its own message. | Accepted: every error with a status code on this path has a fixed message. |
| P3 (5/10) | propertyController.js:3972 | A base64 body would answer `400`. | Accepted, the review routes behave the same; the API Gateway check would show it. |

## Not in scope

- Revoke and lookup of a grant, and their API Gateway step: the next pull request.
- Making the route reachable: a manual API Gateway step after this pull request is merged, deployed and released to `main` (see `docs/internal/tools/direct_booking_website_elite_grant.md`).
- `InvalidParameterException` in `AuthManager`: a change for all routes, see the first finding.
- An admin page for grants: optional, later.

## Mutation check

26 mutants, all caught: 19 in the controller (actor from the body, body read before the token, any user or any Host as admin, refusal message, every auth error as 403, no object check, broken JSON, status code, raw message, code of any error, no code on 409, no `no-store` on success and on error, reason in the log, no log line, account from the token, the whole body spread before or after the actor) and 7 in the routing (no POST route, no PATCH guard, no DELETE guard, a prefix guard catching the rate plan PATCH, a prefix POST route before the webhook, matching on the resource only, a wrong path).
