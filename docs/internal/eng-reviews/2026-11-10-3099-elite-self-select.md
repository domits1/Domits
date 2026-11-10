# #3099 Let a host choose the Elite website plan without payment

Pull request: this one
Issue: #3099
Reviewed commits: a27c79aa9, fdc845dbf, 2e8e1dc1d, 3c9e84645, 2db0cd966, 2b3301e56, 2dee6c7d2 and df0e6053c, each as a staged diff before its commit, then the whole branch against `acceptance` with a second, independent review
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | directBookingWebsiteRatePlanRepository.js:30 | The "no end date" half of the already-on-target check had no test. | Fixed before 2e8e1dc1d: an Elite with a pending end is replaced by one without. |
| P3 (6/10) | directBookingWebsiteRatePlanService.js:294 | The same-plan guard had no test of its own; without it a transaction would still run. | Fixed before 3c9e84645: choosing the current plan runs no transaction. |
| P3 (6/10) | websiteRatePlanRealPath.test.js | The paid restore path (`resumeSubscription`) was not pinned on the real path. | Fixed in 3c9e84645, with the list set to `*`. |
| P2 (7/10) | DirectBookingWebsitePlanSection.jsx:398 | The plan card has no notice for `upgraded`, its failure text speaks of checkout, and with checkout on its Elite button opens up under the paid price while a listed host gets Elite without payment (second review). | Fixed in df0e6053c: the free path needs `withoutPayment: true`, which today's card never sends, so the card always gets the paid flow. |
| P3 (6/10) | websiteRatePlanRealPath.test.js | df0e6053c removes the real-path tests of the paid restore and of the 500 on a failed write. | Accepted: without `withoutPayment: true` the code is the acceptance code verbatim, the paid downgrade stays pinned, the restore has its service test, and the rollback its repository test. |
| P3 (5/10) | directBookingWebsiteRatePlanRepository.js:194 | A unique violation is not retried, so a second request from another tab can answer `409` instead of `unchanged`. | Accepted: the data stays correct, the card already blocks a double click, and the `409` text says to reload. |
| P3 (5/10) | propertyController.js:3896 | A failed write answers `500` with the database message, through the existing catch of this route. | Accepted, unchanged behaviour of the route. |
| P3 (5/10) | websiteEliteSelfSelect.js:6 | Repeats the list split of `reviewAdminAllowlist.js`. | Accepted: the matching differs on purpose (exact, no trim, `*`). |
| P3 (5/10) | support/ratePlanStore.js | `orderBy` ignored its arguments. | Fixed in 2e8e1dc1d: the store throws on any other order. |
| P2 (6/10) | support/ratePlanStore.js:109 | Second review: `where()` added a condition where TypeORM replaces them, so a `where` in place of `andWhere` on the status of the update (which would end other hosts' plans) passed every test. | Fixed in 2b3301e56; that mutant and the same one on the read are now caught. |
| P3 (6/10) | support/ratePlanStore.js:120 | Second review: `returning()` was ignored, so returning only `id` passed. | Fixed in 2b3301e56. |
| P3 (6/10) | directBookingWebsiteRatePlanRepository.unpaid.test.js | Second review: no race with the real `activatePaidPlan`. | Fixed in 2b3301e56: the paid activation commits first, the change runs again and answers `paid_plan_active`. The other order is the existing webhook behaviour: it loses with `40001`, answers 400, and Stripe sends it again. |

Mutation check: 48 mutants over the list, the service, `withoutPayment` (flag check skipped or after the plan read, the free path without the field, a fall-through to checkout, the string `"true"`), the repository and the controller, 46 caught. The 2 survivors are equivalent: dropping `.filter(Boolean)` (an empty entry could only match an empty id, which is refused first) and always running the update (an update without matching rows changes nothing).

## Decisions

- The list is a Lambda variable, like `PROPERTY_REVIEW_ADMIN_USER_IDS`, and not an SSM parameter: an SSM parameter would also need the named-parameter IAM policy of PropertyHandler changed, and adds a network read and a cache to the plan path.
- The free path needs `withoutPayment: true` in the request (option b); everything else runs the existing code.
- Taking an id off the list does not end an Elite that was already chosen. Ending it would mean reading the list in every entitlement check, including the public site render.

## Not in scope

- The plan card. The option to choose Elite without payment is added in a later pull request, shown only when `eliteSelfSelectAvailable` is true.
