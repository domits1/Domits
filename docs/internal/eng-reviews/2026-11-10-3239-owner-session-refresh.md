# fix(property-owners): refresh the sign-in before each owners request

Pull request: (to be opened)
Issue: #3239
Reviewed commit: uncommitted changes on top of 9a036ec39
Result: no blocking findings

The problem: after about an hour the owners pages got `401` from the property owners API and showed "Your session has ended. Please sign in again." with a Retry button. `getAccessToken()` in `src/services/getAccessToken.js` reads the stored access token from `localStorage` and never refreshes it, so once that token expired every request failed. Retry sent the same expired token again. Only a hard refresh helped, because Amplify refreshes the tokens when the app starts.

The fix:

- `hostowners/services/ownerService.js` reads the token through `Auth.currentSession()`, the same pattern as `priceLabsService.js` and `missedRevenueService.js`. Amplify refreshes an expired access token there with the refresh token. The token is still sent without a `Bearer` prefix, and the session is read again for every request.
- When there is no session, or the session has no token, the service throws the same `OwnerApiError` with status `401` and the signed-out message as before, so `ownerText.js` and the pages did not change. A network failure while the session is refreshed is passed on unchanged, see the first finding.
- `hostowners/pages/HostOwners.js` shows Retry only when `canRetryLoad` says loading again can help, the same as `HostOwnerDetail.js`. It is hidden after a `401`, `403`, `400` and `404`. The error text stays.
- The owner form, the detail page and set-shares use the same service, so they get the refresh too.

```
request ──▶ Auth.currentSession()
              │
              ├─ token ───────────▶ fetch with Authorization: <token>
              ├─ no user / no token ▶ OwnerApiError 401 ▶ signed-out text, no Retry
              └─ NetworkError ─────▶ passed on ─────────▶ generic text, Retry
```

Tests: `ownerService.test.js` and `HostOwners.test.js` mock `Auth.currentSession` instead of `getAccessToken`, and the existing tests keep their meaning. New cases cover a session without a token (null, undefined, empty), no signed-in user, a refresh token that expired, an empty session, a network failure while reading the session, a new session read for every request with the token sent unchanged, no Retry after a `401`, `403` and `404`, and Retry after a `500`, a missing API URL and a network failure. All 361 tests in `hostowners` pass and ESLint is clean.

Mutation checks. Each change below was made on purpose, and at least one test failed for each: a network failure reported as signed out, the token read once and reused, a `Bearer` prefix added, an empty token accepted, Retry always shown and Retry never shown.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:48 | The first version turned every `Auth.currentSession()` failure into the signed-out `401`. A network failure during the token refresh also rejects there: the Cognito client marks it with `code: "NetworkError"` (`amazon-cognito-identity-js/lib/Client.js:147`), and `currentSession` passes it on (`@aws-amplify/auth/lib/Auth.js:1637`). Together with the hidden Retry, a short connection drop at refresh time showed "Your session has ended" with no way to try again. | Fixed. A `NetworkError` is passed on unchanged, like a failed `fetch`, so the page shows the generic text with Retry. Tests cover it in the service and on the list page. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/pages/HostOwners.js:62 | `canRetryLoad` also hides Retry after a `400` or `404` on the list page. The list route has no id, so a `404` there points at a wrong API URL rather than a missing owner. | Accepted. Retry cannot fix a configuration problem either, and the list page now follows the same rule as the detail page. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:60 | There is no retry when the server rejects a token that still looks valid in the browser, for example after a sign-out on another device. The host sees the signed-out text without Retry. | Accepted. A forced refresh and a second request belong in a shared helper, see Not in scope. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/pages/HostOwners.test.js:74 | One full `hostowners` run failed 2 of 361 tests: the first test of `HostOwners.test.js` and the first test of `HostOwnerDetail.test.js:104`, both with "Exceeded timeout of 5000 ms". Both are loader tests that mock the service, so they never reach `Auth.currentSession`, and `HostOwnerDetail.test.js` is not part of this change. In that run `hostOwnerDetailRoute.test.jsx` took 214 seconds next to them. The same two files pass when run on their own, and other full runs passed 361 of 361. | Not fixed here. It is a timing problem in the first test of a page file when many suites run in parallel, not a problem in this change. The timeout was not raised. Follow-up: find out why `hostOwnerDetailRoute.test.jsx` is so slow, since it loads the whole host dashboard. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:48 | Only `NetworkError` is treated as temporary. `websiteSession.js:22` also treats `TooManyRequestsException`, `InternalErrorException` and `LimitExceededException` from Cognito as temporary. Those still show the signed-out text. | Accepted. They are rare during a refresh, and the full list belongs in the shared helper. |

## Not in scope

- About 35 other host dashboard files use the same `getAccessToken()` and have the same problem after an hour, among them `hostproperty/services/hostPropertyApi.js`, `propertyreview/services/propertyReviewApi.js`, `hostsettings/services/complianceApi.js` and the KPI services. They are not changed here. A possible team follow-up is a shared helper in `src/services/`, based on `fetchWithWebsiteSession` in `website/services/websiteSession.js`, which also forces one refresh and retries once on a `401`.
- `getAccessToken.js` itself. It is shared auth code, and changing it to an async read changes every caller.
- A sign-in link next to the signed-out text. The text already says to sign in again.
