# feat(property-owners): add the owner API client and helpers

Pull request: #3744
Issue: #3239
Reviewed commit: uncommitted changes on top of c99e5d0bc, fixes included in 276756b33
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerApiConfig.js:5 | The API URL also accepted `http:`, so the access token could be sent unencrypted. | Fixed in 276756b33. Only an absolute `https:` URL is accepted. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:74 | `setShares` was not `async`, so `setShares()` without an argument threw synchronously instead of returning a rejected promise like the other functions. | Fixed in 276756b33. `setShares` is `async`; a test covers the call without an argument. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:43-44 | The message when no sign-in token can be read was unclear to the host. | Fixed in 276756b33. The message is now "We could not read your sign-in. Please sign in again." |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/utils/utcDate.js:2 | `MAX_EFFECTIVE_FROM_DAYS_AHEAD = 1826` duplicates the value in `backend/functions/property-owners/business/validation/shareValidator.js:9`. | Accepted. The web app and the backend are separate workspaces, and the server still enforces the limit. |
| P2 (9/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerApiConfig.js:12 | `REACT_APP_PROPERTY_OWNERS_API_URL` is not set in any build yet. CRA inlines it at build time, so without it every call fails with the configuration error. | Known. Pending the team's answer on where build variables live; it must be set before the owners UI ships. |

## Not in scope

- The owners UI (list, form, detail, archive, set shares): the next pull requests of #3239.
- getAccessToken() also returns nothing when several Cognito logins are cached in the browser, so the host then sees the sign-in message while signed in. This is existing shared behaviour (src/services/getAccessToken.js), not changed here.
