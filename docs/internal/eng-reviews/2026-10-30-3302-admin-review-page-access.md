# #3302 feat(hostdashboard): admin property review page, access check and menu item

Pull request: this one
Issue: #3302
Reviewed commit: uncommitted
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | frontend/web/src/features/hostdashboard/Pages2.js:50 | `internalOnly: true` became `internalOnly: "channex"` on the Distribution item, but no test mentions Distribution (`grep Distribution Pages2.test.jsx` finds nothing). A wrong key would show or hide the Distribution menu item with every test still green. | Fixed in this pull request: Pages2.test.jsx checks Distribution is shown when Channex allows and hidden when it denies. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/Pages2.js:84-87 | `Promise.allSettled` waits for the slower check, and `fetch` in `propertyReviewAccess.js:11` has no timeout. If `/review/access` hangs, the Channex and Distribution items never appear either. A slow check only delays them; a hanging one removes them. | Accepted for now: the delay was accepted. Follow-up: set the two flags as each check settles, or add a timeout. Do it in PR 2 with the shared access state. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/propertyreview/propertyReviewAccess.js:15 | `!response.ok` returns `false`, so a 401, 429 or 503 looks the same as a 403. `PropertyReviewPage.jsx:45-54` then shows "Not authorized" to a real admin during an outage. The backend contract has a distinct 503 that PR 4 must show as "try again". | Follow-up: return three states (allowed, denied, unavailable) when the page gets real content. Accepted for the placeholder; it only decides what a user sees. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/Pages2.js:86 and propertyreview/PropertyReviewPage.jsx:20 | The same `GET /review/access` runs twice per visit: once for the menu and once when the page mounts. | Accepted. The page check is the independent gate, as on the Channex page. Share the result through a context in PR 2 if the extra request matters. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/propertyreview/propertyReviewAccess.js:7 | `getAccessToken()` returns `null` when the browser holds several Cognito logins, and logs only to the console. The check returns `false` and the page says "Not authorized" with no hint to refresh. | Accepted. The same happens on every other host page. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/propertyreview/PropertyReviewPage.jsx:34-64 | The same `<main><section>` block appears three times, and it copies the Channex page markup and its global class names (`channex-admin-page`, via the `HostIntegrations.scss` import on line 3). | Accepted for the placeholder. PR 2 replaces the import with its own CSS module and removes the repetition. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/Pages2.js:78 | `access[item.internalOnly]` is `undefined` for an unknown key, so a mistyped key hides the item. It fails closed, but nothing tells the developer. | Accepted. The safe direction; the new nav tests cover the real keys. |

## Not in scope

- Route guard for `admin/property-review`: the page checks access itself and the backend returns 403. As with Channex diagnostics, the route is not wrapped. The placeholder shows no data.
- The Distribution route and its missing guard (`mainDashboardHost.js`): a separate follow-up, decided out of scope.
- Queue, detail, approve and reject: PRs 2 to 4 of #3302, once the payload shapes are confirmed.
- Translations: English only for this internal page, no `content/*.json` changes.
- The 403 / 503 / 409 handling from the backend contract: it belongs to the PRs that call those endpoints.
