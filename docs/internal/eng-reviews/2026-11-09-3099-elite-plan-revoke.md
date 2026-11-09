# #3099 Revoke a granted Elite website plan

Pull request: this one
Issue: #3099
Reviewed commits: 1420080be, 9ea0519c8, 4cde54159, cf4b5f73f and b4812d49a, each as a staged diff before its commit
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | support/ratePlanGrantStore.js:145 | The fake released held commits inside the executor of the last transaction to arrive, so that one always committed last. A race test could pass or fail on the number of awaits in a transaction body: a no-op `.then` in the revoke flipped the commit order. | Fixed in cf4b5f73f: held commits are released one microtask later, in the order the transactions started. |
| P3 (9/10) | directBookingWebsiteRatePlanRepository.js:146 | The grant lookup also required no subscription, which the paid refusal on the line above already guarantees. The mutation check showed it as an equivalent mutant. | Removed in b4812d49a. The three paid tests pin the order of the two checks. |
| P3 (6/10) | directBookingWebsiteRatePlanRepository.js:151 | When the revoke commits before a host's own switch to Essentials (`changePlan`, not one transaction), the host's Essentials insert hits the unique index and he gets a 500 once. On the next try he sees Essentials. | Accepted: existing behaviour of `changePlan`, the same as with the grant. |
| P3 (6/10) | propertyController.js:3961 | `authorizeWebsitePlanAdmin(event, refusalMessage)` has no default; a caller that leaves it out answers 403 with an empty message. | Accepted: the only caller, the grant route, passes its message, and its tests pin it. The revoke and lookup routes of the next pull request pass their own. |
| P3 (5/10) | directBookingWebsiteRatePlanRepository.js:26 | `ESSENTIALS_PLAN_VALUES` repeats price, currency and billing of `GRANTED_PLAN_VALUES`. | Accepted, explicit values per plan. |

## Decisions

- No self-revoke guard and no Cognito lookup. The grant refuses an admin's own account because it would raise his plan; a revoke only lowers it, and it only acts on an existing grant row of that exact account id. An unknown id answers `not_granted`.
- The revoke ends the current plan only when it is Elite without a subscription, which is what a grant is. The running check uses the database clock (the same current scope as `findCurrentByAccountId`), so a grant whose end date has passed answers `not_granted`.
- Two revokes at the same moment: the loser re-runs (`withDsqlRetry`) and answers `not_granted`. A revoke and a grant at the same moment end in the order of their commits; both are recorded.

## Not in scope

- The admin routes, the lookup and the API Gateway step: the next pull request.
- Making `changePlan` one transaction: existing host flow.
- `findCurrentByAccountId` and `getCurrentPlan` are not touched.

## Mutation check

30 mutants on the new guards and branches and on the shared steps of the refactor, all caught: no paid refusal, paid refusal for `ACTIVE` only, no `not_granted` refusal, any current plan or a running Essentials counted as a grant, the grant not ended before the Essentials insert, Elite instead of Essentials, Essentials without an open end, the audit row as a grant event, the audit row naming the new plan, the end date always formatted, no audit row, the read without the time scope, the read without the account, the revoke conflict as a grant error, the shared change without the retry, the grant always running its update, no conflict mapping, the grant's paid message on the revoke, the message option ignored, the revoke and the grant without the table check, the table check rethrowing the raw error, the raw request passed on, `revokedPlanId` of the new plan, action `granted`, and the actor, account, reason and reason length checks.
