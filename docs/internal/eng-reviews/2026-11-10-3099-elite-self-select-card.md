# #3099 Let a host choose Elite on the website plan card without payment

Pull request: this one
Issue: #3099
Reviewed commits: 851fa909c, 20f52f8f8, 3959b4b5c, d7c1da982, 668c315f1 and the documentation commit that adds this file, each as a staged diff before its commit, then the branch on top of #3809 in a second, independent review before 668c315f1; on the same day 22b9b163e, da801a28e and the documentation commit after them, each as a staged diff
Result: no blocking findings; four findings of the second review fixed in 668c315f1; the open point on a checkout session closed by the request contract in da801a28e

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.jsx (in 3959b4b5c) | When the plan could not be read again after a failed change, the card kept the plan it showed before and offered the same change again, although the change may have reached the server. | Fixed in 668c315f1: the card shows the existing load message instead of a plan, and a reload shows the plan the server holds. |
| P3 (8/10) | DirectBookingWebsitePlanSection.jsx (in 3959b4b5c) | A session that expired only during that second read gave "Please try again" instead of the login message. | Fixed in 668c315f1: the load message goes through `describeFailure`, so it is the login message. |
| P3 (7/10) | DirectBookingWebsitePlanSection.jsx (in 3959b4b5c) | An answer without a plan led to a read; when that read failed, the card said the change failed and read a second time. | Fixed in 668c315f1: a failed read after an answer without a plan shows the load message once. |
| P3 (6/10) | DirectBookingWebsitePlanSection.jsx:402, :407 | The reads after a change were not checked against the running change after their answer. | Fixed in 668c315f1. After unmount React drops these updates, so the checks change nothing visible (mutants M28 and M29 survive for that reason). |
| P3 (7/10) | DirectBookingWebsitePlanSection.jsx (in 3959b4b5c) | Two clicks inside one render both sent a change, and an answer after unmount still started a read. | Fixed in d7c1da982: the running change is held in a ref until it ends, and unmount clears it. |
| P3 (7/10) | DirectBookingWebsitePlanSection.jsx:17 | The notice table is shared, so the existing path now also maps `upgraded`. It differs from #3809 only when the switch is turned on between the plan read and a click while checkout is on, and then the new notice is the right one. | Accepted. |
| P3 (5/10) | DirectBookingWebsitePlanSection.jsx:104 | With the option on, an Elite plan without a subscription that has an end date still shows "Scheduled" on Essentials, so that host cannot switch back on the card. | Accepted. A self-selected Elite plan has no end date (#3835 writes `effective_until: null`); only the closed grant work wrote one. |
| P3 (5/10) | DirectBookingWebsitePlanSection.jsx:401 | A read that answers 200 with a body that is not JSON hides the card without a message. | Accepted. Same as the first load today, and outside the API contract. |
| P3 (5/10) | DirectBookingWebsitePlanSection.jsx | A request that never answers keeps "Processing..." until a reload. | Accepted. Same as the existing path; the session fetch has no time limit. |
| P3 (6/10) | DirectBookingWebsitePlanSection.test.jsx | The tests mock the copy, so a key missing from a language file fails no test. | Accepted. Both new keys were checked in `en`, `nl`, `de` and `es`. |
| P3 (8/10) | DirectBookingWebsitePlanSection.test.jsx (in 851fa909c) | The card shape for an Elite plan without a subscription was written out three times. | Fixed before 851fa909c: one constant. |

## Decisions

- Context: since 10 November a host may choose Elite himself, without payment, when a switch on the backend allows it (#3835). The plan answer tells the card with `eliteSelfSelectAvailable`. Every host without it must see the card exactly as with #3809.
- Options for the click path: extend the existing change handler with branches, or add a separate handler that the existing one hands over to.
- Choice: a separate handler, `choosePlanWithoutPayment`, entered only when the field is exactly `true`. The existing handler is unchanged apart from the moved notice table.
- Consequences: on this path the card never redirects to Stripe, a checkout answer is a failed change, and after a failed change the card reads the plan again and shows that plan, or the load message when the read fails. The existing path keeps its own error texts and does not read again.

## Request contract, 10 November

- Context: with only `plan` in the body, a request from the card could fall through to Stripe checkout on the server when the switch was turned off for the host between his plan read and his click while checkout is on. The card did not follow the answer, but could not prevent the checkout session.
- Options: leave it until checkout opens, or let the request say it is without payment.
- Choice: the request says it. On the path without payment the card sends `{"plan":"elite","withoutPayment":true}` and `{"plan":"essentials","withoutPayment":true}`. The contract agreed for #3835: it takes the path without payment only for exactly `true`, answers 409 with nothing written and no Stripe call when the switch is off for the caller or the current plan has a subscription, runs today's code when the field is absent or `false`, and answers 400 for any other value.
- Consequences: a self-select request can no longer start a checkout. A 409 or a 400 takes the card's failure path: it reads the plan again and shows what the server says now, for example the card of #3809 when the switch went off, or the paid Elite plan when a subscription started in between. Every other request keeps the body of #3809 byte for byte (pinned in 22b9b163e as JSON text, in the service and through the card with the real service). `changeWebsiteRatePlan` adds the field only for exactly `true`.
- Findings on 22b9b163e and da801a28e, all P3 and accepted: a test answer list that runs out turns an extra request into a failure path instead of a clear test error (an extra PATCH is still caught by the exact body list); the list of field values is defined in both card test files; an explicit `null` as the second argument of `changeWebsiteRatePlan` would throw (no caller passes one).
- Mutation check for the contract, 9 mutants, all caught: the field dropped for Elite, for Essentials, and for both; the field sent on the path of #3809; the service always, never, for any truthy value, or with the raw value sending it; and a redirect on a 409. The 30 mutants above were run again on da801a28e with the same result.

## Not in scope

- The 409 text of the backend is English only; the card shows its own translated change message.
- Showing the option before the backend is deployed: without the field the card stays as with #3809.

## Mutation check

30 mutants on a copy, each guard and branch broken one at a time: 28 caught, 2 survivors that change nothing visible (M28 and M29, the checks after a read once the card is gone). Caught, among others: the option always on (69 tests fail, including the pin of every existing plan shape), any truthy value counted as on, the option never on, the price still shown, the checkout rule kept on the button, the subtitle never or always swapped, the old path taken, a checkout answer taken as success or followed, no second read after a failure, the read plan not shown, no failure message, the login message replaced, no upgraded notice, no notice, no read for an answer without a plan, the answer plan ignored, no guard against a second click, no check after the answer or the failure, unmount not ending the change, the guard or the busy state never released, the busy state never set, an old message kept, the last plan kept when the read fails, and the login message lost on a failed read.
