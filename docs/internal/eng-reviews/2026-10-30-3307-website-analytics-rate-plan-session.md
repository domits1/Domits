# #3307 Refresh the login for website analytics events and the website rate plan

Pull request: #3748
Issue: #3307
Reviewed commit: 6383345 (each commit was reviewed as a staged diff before it was made; a second review of the whole branch ran on 6b512ce)
Result: no blocking findings in the staged reviews; the second review found 1 defect, fixed in fb0f538

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (5/10) | `website/analytics/websiteAnalyticsService.js:39` | The `keepalive` abandonment event on `pagehide` now starts after the session read instead of inside the handler. With a valid cached session the read needs no network call and the event still starts. With an expired access token the refresh needs the network and may not finish before the page is gone. | Accepted: with an expired access token that event already failed before this change (the backend answered 500). |
| P3 (8/10) | `hostsettings/services/websiteRatePlanService.js:2` | Host settings now import the session helper from the website feature. | Accepted: no cycle, and it is the same helper the website services use. Move it to `src/services` when a third feature needs it. |
| P3 (8/10) | `hostsettings/components/DirectBookingWebsitePlanSection.jsx:31` | The two login messages are English, while the plan section is translated. | Accepted: the same messages as the website editor. Translating them is a separate change for all website services. |
| P3 (6/10) | `PropertyHandler/controller/propertyController.js:3813` | A rate plan change that fails at Stripe still returns the Stripe message in the body. | Accepted: unchanged behaviour, and the page shows its own copy instead of the body. |
| P3 (6/10) | `PropertyHandler/controller/propertyController.js:2731` | `isWebsiteDraftClientError` runs before `websiteFailureResponse` on the analytics route. | No change: none of its prefixes match the login messages. |
| P2 (9/10) | `hostsettings/components/DirectBookingWebsitePlanSection.jsx:304` | Second review: when every checkout poll failed because the login check could not reach Cognito, the host saw only the still-pending notice and never the connection message. | Fixed in fb0f538: the connection message is shown next to the notice when the last attempt failed that way. |
| P3 (8/10) | `hostsettings/services/websiteRatePlanService.test.js`, `website/tests/websiteAnalyticsService.test.js`, `website/tests/websiteBuilderAnalyticsSession.test.jsx` | Second review: three test names promised more than they check ("changes the plan once", "keeps the editor usable"), and the retry-loop test would pass if the first failure were reported instead of the last. | Fixed in 6383345. |
| P3 (7/10) | `PropertyHandler/controller/propertyController.js:2250` | Second review, existing code: `existingDraft?.id \|\| draftId \|\| null` stores a draft id from the request when the host's property has no draft, without checking it. | Not changed here. The event row keeps the host and listing from the token check. Worth a separate fix. |
| P3 (7/10) | `website/analytics/websiteAnalyticsService.js:84` | Second review, existing code: the terminal event retry also retries after a 500 or a lost answer, so an event that was stored can be stored twice. | Not changed here; the retry loop predates this change. |
| P3 (6/10) | `PropertyHandler/controller/propertyController.js:2247` | Second review, existing code: the analytics handlers call the repositories from the controller. | Not changed here; this change only touches the catch. |

## Failure modes

- Expired session on a host analytics event: no request and nothing on screen. The retrying terminal event stops at once instead of trying three times.
- Cognito unreachable during the login check of an analytics event: no request and nothing on screen. The terminal event tries again, as before.
- Access token expired on the way: one forced refresh and one retry. This holds for the rate plan change too, because the backend answers 401 only for the login check, which runs before anything is read or written.
- Stripe rejects our own call with 401 during a rate plan change: the backend now answers 500, so the page does not retry the change or ask the host to log in again.
- Session expires while the page confirms an Elite checkout: polling stops, the session expired message is shown, and the buttons stay disabled so no second checkout can start.
- Cognito unreachable while the page confirms an Elite checkout: polling goes on. When the last attempt still fails that way, the connection message is shown next to the still-pending notice.

## Not in scope

- `handleWebsiteRatePlanWebhook`: Stripe calls it, not a logged-in host.
- `NotFoundException` from the owner check stays a 500 on the analytics route, the same as on the other website routes.
- `enterpriseRatePlanService.js` still reads the stored token. It is not a website service.
