# #3099 Read the website plan entitlements in the host dashboard

Pull request: this one
Issue: #3099
Reviewed commits: d40a5f18a, 95020259d, 9dbb54a5f, b2c7edcd3 and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `acceptance` in a second, independent review; on 10 November d63c22cce, b32041e4f, 45d928371, 17a66ebbb and the documentation commits after them, each as a staged diff, then today's commits in a second, independent review
Result: no blocking findings; one finding of the second review fixed in b2c7edcd3; one test finding of 10 November fixed before d63c22cce

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:21 (in 9dbb54a5f) | The service dropped entries that were not text and kept the rest, so `["website.unlimited_pages", null]` still gave Elite. A malformed answer must give no Elite features. | Fixed in b2c7edcd3: a list with any entry that is not text is rejected, so the hook reports `unavailable` and grants nothing. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:4 | The rate plan path is built a second time; `hostsettings/services/websiteRatePlanService.js:4` has the same base. | Accepted. Two features, one line each. Sharing it means changing the plan card service, which is a separate refactor. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:4 | Until the backend answers `view=entitlements` itself, the GET reaches `getCurrentPlan`, which adds an Essentials row when a host has none (`directBookingWebsiteRatePlanService.js:164-175`). | Accepted. The plan card does the same today, and the hook has no consumer in this pull request. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:6 | `"website.unlimited_pages"` repeats the backend name in `directBookingWebsiteRatePlanService.js:23`. | Accepted. No module is shared between the backend and the web app. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/website/hooks/useWebsiteEntitlements.js:27 | The rejection reason is not kept. | Accepted. A failed read means no Elite features and no message for the host; `status: "unavailable"` tells the consumer. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/hooks/useWebsiteEntitlements.js:37 | The plan is read once per mount, so an Elite plan that starts or ends while the editor is open shows after a reload. | Accepted. The backend decides what is served; the editor change decides whether it needs a reload. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.jsx:97 | An Elite plan without a subscription and without an end date offers "Switch to Essentials", which ends it at once. | Intended since 10 November: a host who chose Elite himself can switch back. Tested in 45d928371. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.jsx | The file is not in Prettier format, as it was before. | Accepted. The new lines follow the file's style; reformatting is a separate change. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.test.jsx (in d63c22cce) | The pinned card arrays repeated two or three times, and several lines passed the print width. | Fixed before d63c22cce: six named card constants. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.test.jsx | The tests mock the copy, so a key missing from a real language file fails no test. | Accepted. `withoutPayment` was checked in all four files; the other plan card keys follow the same pattern. |

## Decisions

- Context: the website editor needs to know whether a host has an Elite feature, and the plan card must show an Elite plan without a Stripe subscription correctly. Since 10 November a host can choose Elite himself, without payment, behind a feature flag that is off by default; that plan has no subscription and no end date. Every host with Essentials or a paid Elite must see exactly what he sees today.
- Options for "without a subscription": an Elite plan with a falsy `stripeSubscriptionId`, or an Elite plan whose `stripeSubscriptionId` is exactly `null`.
- Choice: exactly `null`. The plan view always carries the field (`directBookingWebsiteRatePlanService.js:134`), and a paid Elite always has an id (`:357`, `:402`). A response without the field keeps the card as today.
- Consequences: an Elite plan without a subscription shows "Current plan" and "No payment needed" instead of the price, and never "Reactivate Elite". Without an end date the Essentials card offers "Switch to Essentials". With an end date it keeps "Scheduled" and the end date line, as for any Elite plan with an end date. The entitlement hook fails closed: loading, any error or a malformed answer gives no features and no message.

## Not in scope

- The plan card turns a successful answer that is not JSON into an empty card without a message (`hostsettings/services/websiteRatePlanService.js:10-14`). Unchanged by this pull request.
- Using the hook in the website editor: "#3099 Let Elite hosts switch site pages on in the website editor".
- The backend `view=entitlements` branch: "#3099 Serve website page settings only to Elite hosts".
- The option to choose Elite on the plan card: a later pull request on top of this one.

## Paid plans and copy, 10 November

- d63c22cce pins both cards (every text and both button states) and the end date line for Essentials and paid Elite, also read without the subscription field, with and without a scheduled downgrade. The same test passes on the acceptance version of the card.
- The line is one copy key, `withoutPayment`, in `en`, `nl`, `de` and `es`, so the wording is one line per language.
- The second review of 10 November agreed that the code is correct and found two points. A failed switch to Essentials was tested only for an Elite plan read without the subscription field: 17a66ebbb adds it for an Elite plan without a subscription (the card keeps it and shows the change error). The subtitle "The Elite price is shown below" stays as it is: every host sees it today, so changing it is a change for existing hosts. The option to choose Elite on the card can change it for the hosts who may choose.
- Mutation check on a copy, 10 mutants, all caught: flag never set, every Elite plan without the subscription check, a missing subscription field counts, flag without the Elite check, price shown, neutral line always shown, old copy key, label keeps "Reactivate Elite", button stays enabled, flag not passed to the card. For 17a66ebbb: the busy state never cleared and the displayed plan dropped after a failed switch, both caught.
