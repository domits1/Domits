# #3302 feat(hostdashboard): admin property review API client, three-state access check, Pages2 per-flag access

Pull request: this one (PR 2a of 4)
Issue: #3302
Reviewed commit: uncommitted
Result: no blocking findings, nothing to fix now, five follow-ups

## Findings

| Class | Severity | Where | Finding | Decision |
|---|---|---|---|---|
| FOLLOW-UP | P3 (8/10) | propertyreview/services/propertyReviewApi.js:31 `if (status === HTTP_BAD_REQUEST) return REVIEW_API_ERROR_CODE.INVALID_CURSOR;` | The status-to-code table lives in the shared helper but is specific to the queue. The detail route (PR 3) answers 400 `Missing propertyId.` (`getReviewDetail` throws `TypeException`), which this maps to INVALID_CURSOR, and 404 `Property ... not found.` falls through to SERVER (line 33). Nothing uses this yet. | Follow-up in PR 3: add a NOT_FOUND code and let the caller pass the 400 meaning, or map 400 to a neutral BAD_REQUEST. |
| FOLLOW-UP | P3 (7/10) | propertyreview/PropertyReviewPage.jsx:16-20 and services/propertyReviewApi.js:49 | The access check passes no `AbortSignal` and `fetch` has no timeout. A request that never settles leaves the page on "Checking access" with no Retry. The menu no longer waits for it (Pages2.js:93-98), so only this page is affected. | Follow-up in 2b: the queue hook gets an AbortController on unmount as decided; add a timeout to `requestPropertyReview` there. |
| FOLLOW-UP | P3 (6/10) | propertyreview/propertyReviewAccess.js:16-19 | 401 is `unavailable`, as decided. A signed-in admin with an expired session sees "Could not check your access. Try again." and Retry cannot succeed until they sign in again. The queue error mapping (UNAUTHENTICATED) in 2b is the place to tell them to sign in. | Accepted. Revisit with the 2b error states. |
| FOLLOW-UP | P3 (6/10) | propertyreview/services/propertyReviewApi.js:30 `if (status === HTTP_FORBIDDEN) return REVIEW_API_ERROR_CODE.FORBIDDEN;` | A missing API Gateway route answers 403 `Missing Authentication Token`, which the queue will show as "not authorized" in 2b. The access check already treats 403 as unavailable. | Follow-up in 2b: match the message or check the route exists before launch. |
| FOLLOW-UP | P4 (6/10) | propertyreview/services/propertyReviewApi.js:56 | The NETWORK error drops the original error, so a DNS failure and a CORS failure look the same when debugging. | Follow-up: set `cause` on the thrown error. |
| FOLLOW-UP | P4 (5/10) | propertyreview/propertyReviewAccess.js:13 and services/propertyReviewApi.js:61 | `getAccessToken()` runs twice per access check, and logs "multiple user logins" twice when several are stored. | Accepted. The explicit denied-for-no-token rule sits in the access check, and the helper keeps its own guard for the queue. |

## Not in scope

- Queue UI, loading, empty and error states, load more, de-duplication, the isTest badge and the price line: PR 2b. `fetchReviewQueue` is exported and tested but has no caller yet, on purpose.
- Card link and the detail route: PR 3. Cards get no link until then.
- A shared access context so the menu and the page stop asking twice: accepted in the PR 1 review and unchanged. The request runs once from `Pages2.js:96` and once from the page.
- Route guard for `admin/property-review`: the page checks access itself and the backend returns 403, as in PR 1.
- Design tokens: `:root` in `app.scss` defines only `--primary-color`, `--secondary-color`, `--domits-host-blue` and `--domits-guest-green`. The CSS module uses those colours; greys stay literal, and spacing uses `clamp()`.

## What already exists

- `getAccessToken`, `PROPERTY_API_BASE` and the `ComplianceApiError`-style typed error pattern: reused, not rebuilt.
- The PR 1 access endpoint contract (`allowed` true or false, 200): unchanged, now read through the shared helper instead of its own `fetch`.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Access check | 401, 403, 429, 5xx | yes, `test.each` | returns `unavailable` | Retry card on the page, item hidden in the menu |
| Access check | 200 with a non-JSON body | yes | `unavailable` | same |
| Access check | network failure | yes | `unavailable` | same |
| Access check | request never settles | no | none | "Checking access" for ever (follow-up above); menu unaffected |
| Menu flags | Channex check hangs | yes | each flag is set as its own check settles | Property review item still appears |
| Menu flags | review check hangs | yes | same | Channex and Distribution still appear |
| Retry | two clicks race | covered by the `mounted` guard in each effect | stale result ignored | latest result only |
| API client | 400, 401, 403, 429, 502, 503, 504, 500 | yes, table | typed `PropertyReviewApiError` | not rendered yet (2b) |
| API client | non-JSON error body | yes | fallback message with the status | not rendered yet (2b) |
| API client | abort | yes | rethrown unchanged | caller ignores it |

No critical gap: every failure with no test (the hanging page check) is visible to the user and only affects the placeholder page.

## Flow

```
Pages2 mount ──▶ loadChannexAccess() ──▶ flag "channex"        (each flag set as its own check settles)
            └──▶ checkPropertyReviewAccess() ──▶ flag "propertyReview" (only "allowed" shows the item)

PropertyReviewPage ──▶ checkPropertyReviewAccess() ──▶ requestPropertyReview("/review/access")
   checking ──▶ allowed      ──▶ placeholder
            ├─▶ denied       ──▶ "Not authorized"
            └─▶ unavailable  ──▶ "Could not check your access. Try again." [Retry] ──▶ checking
```
