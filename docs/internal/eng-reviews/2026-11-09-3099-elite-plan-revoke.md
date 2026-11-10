# #3099 Revoke a granted Elite website plan

Pull request: this one
Issue: #3099
Reviewed commits: 1420080be, 9ea0519c8, 4cde54159, cf4b5f73f, b4812d49a and 123ce4363, each as a staged diff before its commit, then the branch on top of `elite-plan-grant-route` with a second, independent review
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | support/ratePlanGrantStore.js:145 | The fake released held commits inside the executor of the last transaction to arrive, so that one always committed last. A race test could pass or fail on the number of awaits in a transaction body: a no-op `.then` in the revoke flipped the commit order. | Fixed in cf4b5f73f: held commits are released one microtask later, in the order the transactions started. |
| P3 (9/10) | directBookingWebsiteRatePlanRepository.js:146 | The grant lookup also required no subscription, which the paid refusal on the line above already guarantees. The mutation check showed it as an equivalent mutant. | Removed in b4812d49a. A first version of this record said the three paid tests pin the order of the two checks; they do not, because their rows are all Elite. Since 123ce4363 a paid Essentials row pins that the paid refusal comes first. |
| P3 (6/10) | directBookingWebsiteRatePlanRepository.js:151 | When the revoke commits before a host's own switch to Essentials (`changePlan`, not one transaction), the host's Essentials insert hits the unique index and he gets a 500 once. On the next try he sees Essentials. | Accepted: existing behaviour of `changePlan`, the same as with the grant. |
| P3 (6/10) | propertyController.js:3961 | `authorizeWebsitePlanAdmin(event, refusalMessage)` has no default; a caller that leaves it out answers 403 with an empty message. | Accepted: the only caller, the grant route, passes its message, and its tests pin it. The revoke and lookup routes of the next pull request pass their own. |
| P3 (5/10) | directBookingWebsiteRatePlanRepository.js:26 | `ESSENTIALS_PLAN_VALUES` repeats price, currency and billing of `GRANTED_PLAN_VALUES`. | Accepted, explicit values per plan. |

## Second review

Agreed on authorization, the account scope, the failure answers, every race listed below, the single transaction, the clocks, the refactor having no behaviour change, comments and layering. It found:

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | directBookingWebsiteRatePlanRepository.revoke.test.js | The paid fixtures were all Elite, so swapping the paid refusal and the grant check passed every test. | Fixed in 123ce4363 with a paid Essentials row; the swapped order is now caught. |
| P3 (8/10) | directBookingWebsiteRatePlanService.revoke.test.js | "No `website.unlimited_pages`" also passed for an empty entitlement list. | Fixed in 123ce4363: the exact Essentials list. |
| P3 (7/10) | directBookingWebsiteRatePlanRepository.revoke.test.js | Only the paid activation committing first was tested. | Fixed in 123ce4363: when the revoke commits first, the activation fails with a conflict and changes nothing (it has no retry; the webhook answers 400 and Stripe sends it again). |
| P3 (5/10) | support/ratePlanGrantStore.js | In the replacement races both conflict checks of the fake fire (the updated row and the current-plan index), so the tests do not prove each check on its own. The fake does not model the subscription index. | Accepted: DSQL also conflicts on both, and the tests check how the code reacts to a conflict, not the fake. |
| P3 (5/10) | directBookingWebsiteRatePlanService.js, changePlan | The host's own switch to Essentials is two statements; racing a revoke it can leave a short moment without a current row, or answer 500 once. | Accepted: existing host flow, unchanged here. |
| P3 (5/10) | propertyController.js, changeWebsiteRatePlan and the webhook | Existing handlers answer a raw error message. | Not changed: existing routes. Reported as a question. |

## Decisions

- No self-revoke guard and no Cognito lookup. The grant refuses an admin's own account because it would raise his plan; a revoke only lowers it, and it only acts on an existing grant row of that exact account id. An unknown id answers `not_granted`.
- The revoke ends the current plan only when it is Elite without a subscription, which is what a grant is. The running check uses the database clock (the same current scope as `findCurrentByAccountId`), so a grant whose end date has passed answers `not_granted`.
- Two revokes at the same moment: the loser re-runs (`withDsqlRetry`) and answers `not_granted`. A revoke and a grant at the same moment end in the order of their commits; both are recorded.

## Not in scope

- The admin routes, the lookup and the API Gateway step: the next pull request.
- Making `changePlan` one transaction: existing host flow.
- `findCurrentByAccountId` and `getCurrentPlan` are not touched.

## Mutation check

31 mutants on the new guards and branches and on the shared steps of the refactor, all caught: no paid refusal, the grant check before the paid refusal, paid refusal for `ACTIVE` only, no `not_granted` refusal, any current plan or a running Essentials counted as a grant, the grant not ended before the Essentials insert, Elite instead of Essentials, Essentials without an open end, the audit row as a grant event, the audit row naming the new plan, the end date always formatted, no audit row, the read without the time scope, the read without the account, the revoke conflict as a grant error, the shared change without the retry, the grant always running its update, no conflict mapping, the grant's paid message on the revoke, the message option ignored, the revoke and the grant without the table check, the table check rethrowing the raw error, the raw request passed on, `revokedPlanId` of the new plan, action `granted`, and the actor, account, reason and reason length checks.
