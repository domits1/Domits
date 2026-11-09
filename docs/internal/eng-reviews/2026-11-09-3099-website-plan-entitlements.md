# #3099 Read the website plan entitlements in the host dashboard

Pull request: this one
Issue: #3099
Reviewed commits: d40a5f18a, 95020259d, 9dbb54a5f, b2c7edcd3 and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `acceptance` in a second, independent review
Result: no blocking findings; one finding of the second review fixed in b2c7edcd3

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:21 (in 9dbb54a5f) | The service dropped entries that were not text and kept the rest, so `["website.unlimited_pages", null]` still gave Elite. A malformed answer must give no Elite features. | Fixed in b2c7edcd3: a list with any entry that is not text is rejected, so the hook reports `unavailable` and grants nothing. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:4 | The rate plan path is built a second time; `hostsettings/services/websiteRatePlanService.js:4` has the same base. | Accepted. Two features, one line each. Sharing it means changing the plan card service, which is a separate refactor. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:4 | Until the backend answers `view=entitlements` itself, the GET reaches `getCurrentPlan`, which adds an Essentials row when a host has none (`directBookingWebsiteRatePlanService.js:164-175`). | Accepted. The plan card does the same today, and the hook has no consumer in this pull request. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/services/websitePlanService.js:6 | `"website.unlimited_pages"` repeats the backend name in `directBookingWebsiteRatePlanService.js:23`. | Accepted. No module is shared between the backend and the web app. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/website/hooks/useWebsiteEntitlements.js:27 | The rejection reason is not kept. | Accepted. A failed read means no Elite features and no message for the host; `status: "unavailable"` tells the consumer. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/hooks/useWebsiteEntitlements.js:37 | The plan is read once per mount, so a grant that starts or ends while the editor is open shows after a reload. | Accepted. The backend decides what is served; the editor change decides whether it needs a reload. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.jsx:97 | A grant without an end date would offer "Switch to Essentials", which ends the grant at once. No test renders such a grant. | Accepted. A grant always gets an end date; a paid Elite without an end date behaves the same today, and no line of this change decides it. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/hostsettings/components/DirectBookingWebsitePlanSection.jsx | The file is not in Prettier format, as it was before. | Accepted. The new lines follow the file's style; reformatting is a separate change. |

## Decisions

- Context: the website editor needs to know whether a host has an Elite feature, and the plan card must show an Elite plan granted by Domits, which has an end date but no Stripe subscription. Every host who has no grant must see exactly what he sees today.
- Options for "granted": an Elite plan with a falsy `stripeSubscriptionId`, or an Elite plan whose `stripeSubscriptionId` is exactly `null`.
- Choice: exactly `null`. The plan view always carries the field (`directBookingWebsiteRatePlanService.js:134`), and a paid Elite always has an id (`:357`, `:402`). A response without the field keeps the card as today.
- Consequences: a granted plan shows "Current plan", "Granted by Domits" and its end date. The Essentials card keeps "Scheduled" for an Elite plan with an end date, so a host cannot end his grant himself. The entitlement hook fails closed: loading, any error or a malformed answer gives no features and no message.

## Not in scope

- The plan card turns a successful answer that is not JSON into an empty card without a message (`hostsettings/services/websiteRatePlanService.js:10-14`). Unchanged by this pull request.
- Using the hook in the website editor: "#3099 Let Elite hosts switch site pages on in the website editor".
- The backend `view=entitlements` branch: "#3099 Serve website page settings only to Elite hosts".
- Letting a granted host end the grant himself, or an admin ending it: the revoke route of #3099.
