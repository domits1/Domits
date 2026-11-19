# #3302 feat(hostdashboard): admin property review queue list, request timeout, NETWORK cause

Pull request: this one (PR 2b of 4, stacked on 2a)
Issue: #3302
Reviewed commit: uncommitted
Result: no BLOCK, no FIX NOW, five follow-ups

## Findings

| Class | Severity | Where | Finding | Decision |
|---|---|---|---|---|
| FOLLOW-UP | P3 (8/10) | propertyreview/queue/reviewQueueFormat.js `return { message: "Could not load the queue.", canRetry: true };` and queue/usePropertyReviewQueue.js:72 `if (nextCursor) return loadPage(nextCursor);` | A rejected cursor (400, code INVALID_CURSOR) falls into the generic branch, so a failed load more offers Retry with the same cursor, which can never succeed. The user has to reload the page. | Follow-up: treat INVALID_CURSOR on load more as "refresh the queue" (drop the cursor and reload the first page), or drop Retry for it. |
| FOLLOW-UP | P3 (7/10) | propertyreview/services/propertyReviewApi.js:73 `if (timedOut) throw timeoutError();` | The timeout error carries no `cause`, so a 15 s timeout and a 504 both read as UNAVAILABLE in logs with nothing to tell them apart except the message text. | Follow-up: pass `{ cause: error }` to `timeoutError`. |
| FOLLOW-UP | P3 (6/10) | propertyreview/services/propertyReviewApi.js (`codeForStatus`, 403 to FORBIDDEN) | Carried from 2a: a missing API Gateway route answers 403 `Missing Authentication Token`, which the queue shows as "Not authorized" with no Retry. Not fixed here. | Accepted until launch. Check the route exists in API Gateway before the flag goes live, or match the message. |
| FOLLOW-UP | P4 (6/10) | propertyreview/queue/ReviewQueueCard.jsx `loading="lazy"` on the `<img>` | The placeholder only covers a missing key. An image URL that returns 403 or 404 shows a broken-image icon; there is no `onError` fallback. | Follow-up, shared with the other thumb users; decide once for all of them. |
| FOLLOW-UP | P4 (5/10) | propertyreview/queue/usePropertyReviewQueue.js:46 `setItems((current) => mergeCards(current, page.properties));` | The list only grows. An admin who keeps pressing Load more holds every card in memory and in the DOM. At 20 per page and an admin queue this is fine; it is not bounded. | Accepted. Revisit if the queue regularly exceeds a few hundred cards. |

Size: 808 lines added, 17 removed (net 791) against a hard max of 800. The added count is over by 8; net is under. Flagged, not hidden.

## Resolved from the 2a record

- Timeout (`requestJson`, 15 s, combined with the caller's signal): done, also covers the access check, so "Checking access" can no longer hang for ever. Tested with fake timers, including that no timer is left running.
- `cause` on NETWORK errors: done and tested.
- 401 telling the admin to sign in: done for the queue (`describeQueueError`). The access check still shows "Could not check your access. Try again." for 401, as decided in 2a.

## Not in scope

- Card link and the detail route: PR 3. Cards carry no link, as decided.
- Filtering and sorting: the backend order is shown as returned.
- Translations: English only, as decided.
- Virtualised list: see the unbounded-growth follow-up.
- A shared access context so the page and the menu ask once: unchanged since PR 1.

## What already exists

- `fetchReviewQueue`, `PropertyReviewApiError`, `REVIEW_API_ERROR_CODE` from 2a: reused as is.
- `resolvePrimaryAccommodationImageUrl` through `guestdashboard/utils/image` and its placeholder: reused.
- The `EUR ${n.toLocaleString("en-US")}` format from the host calendar: same shape, kept local because the price here carries "/ night" and the calendar helpers are private to legacy code that must not be extended.
- `StateCard` and the `.retryButton` style: reused for the page; the queue has its own small module for its grid, card, error and button styles.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| First load | 500, network, 429 | yes | `error` set | "Could not load the queue." and Retry |
| First load | 401 | yes | `error` set | "Your session has expired. Please sign in again.", no Retry |
| First load | 403 | yes | `error` set | "Not authorized", no Retry |
| First load | request never settles | yes (timeout test) | 15 s abort becomes UNAVAILABLE | Retry card after 15 s |
| Load more | any failure | yes | `loadMoreError`, cards kept | inline error and Retry, Load more hidden |
| Load more | rejected cursor | no | generic branch | Retry that cannot succeed (follow-up above) |
| Load more | double click | yes | `busyRef` guard | one request |
| Page | 0 cards with a cursor | yes (hook and component) | Load more shown, no empty state | "Load more" |
| Page | overlapping pages | yes | de-duplicated by `property.id`, cards without an id dropped | each listing once |
| Unmount | request in flight | yes | `AbortController.abort()`, no state set | nothing |
| StrictMode | effect runs twice | by design (`busyRef` reset in cleanup, ownership check in `finally`) | second run proceeds | one list |
| Card | missing fields | yes | "—" and placeholder photo | dashes |

No critical gap: the only path without a test (rejected cursor) is visible to the user.

## Flow

```
PropertyReviewPage ──▶ access allowed ──▶ PropertyReviewQueue
                                              │
                                  usePropertyReviewQueue
                                              │
   loadPage(undefined) ─▶ fetchReviewQueue ─▶ requestPropertyReview ─▶ requestJson (15 s timeout + caller signal)
        │                                                                 │
        ├─ ok     ─▶ mergeCards (de-dup by property.id) ─▶ items, nextCursor
        └─ error  ─▶ error (first page) | loadMoreError (later pages) ─▶ describeQueueError

   items == 0 and nextCursor == null ─▶ "No properties waiting for review."
   nextCursor != null                ─▶ "Load more" (also when the last page added 0 cards)
```
