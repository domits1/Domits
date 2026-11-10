# #3302 feat(hostdashboard): admin property review detail summary

Pull request: PR 3a of 4, stacked on 2b
Issue: #3302
Reviewed commit: uncommitted
Result: no BLOCK, one FIX NOW (fixed), four follow-ups

## Findings

| Class | Severity | Where | Finding | Decision |
|---|---|---|---|---|
| FIX NOW | P3 (9/10) | detail/ReviewDetailSummary.jsx `${styles[getListingStatusTone(property?.status)]}` | Draft and archived tones had no CSS class, so the chip got the class name "undefined". Jest maps CSS modules to identity-obj-proxy, so no test can see it. | Fixed: `.draft` and `.archived` added to the module. |
| FOLLOW-UP | P3 (7/10) | backend/functions/PropertyHandler/index.js:45 `isPath(event, "/property/review/approve")` | This branch routes only approve and reject. The `/review/detail` route (like queue and access) must exist in the deployed API before the flag goes live, or the page shows "Not authorized" for the 403 API Gateway returns for a missing route. | Accepted until launch, same as the 2b follow-up. |
| FOLLOW-UP | P4 (8/10) | detail/reviewDetailFormat.js `[REVIEW_API_ERROR_CODE.UNAUTHENTICATED]: "Your session has expired. Please sign in again."` | The same sentence lives in queue/reviewQueueFormat.js. Two copies drift. | Extract one shared message map when PR 4 adds a third caller. |
| FOLLOW-UP | P4 (6/10) | detail/PropertyReviewDetailPage.jsx `<StateCard title="Property review" message="Loading the listing…" />` | The loading card has no `role="status"`, unlike the queue. A screen reader hears nothing while it loads. | Give StateCard an optional role in 3b. |
| FOLLOW-UP | P4 (5/10) | propertyReviewPaths.js `` `/hostdashboard/${PROPERTY_REVIEW_ADMIN_ROUTE}` `` | The list path hard-codes the dashboard mount point. Moving the mount breaks every link; the route test would catch the detail route but not the links. | Accepted. |

Size: 490 lines added, 8 removed (net 482) against a hard max of 500, tests and record included.

## Not in scope

- Access pre-check on the detail page: decided against; the server answers 401, 403 and 404 and the page renders each.
- Photos, amenities, rules, check-in, capacity, "Test listing" badge, registration number: 3b.
- Approve and reject: PR 4. `detail.property.updatedAt` stays in hook state for it.
- Timeout state: the client already maps it to UNAVAILABLE, so it shows the generic error and Retry.

## What already exists

- `fetchReviewQueue` transport, `PropertyReviewApiError`, the 15 s timeout: reused through `requestPropertyReview`.
- `listingStatus` label and tone helpers, `formatReviewPrice`, `formatReviewUpdated`, `EMPTY_VALUE`, `StateCard`, the retry button style: reused.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Load | 404 | yes | NOT_FOUND, no Retry | "This listing no longer exists." and a back link |
| Load | 403, 401 | yes | terminal messages, no Retry | "Not authorized", "Your session has expired. Please sign in again." |
| Load | 5xx, network, timeout | yes (503 path) | generic branch | "Could not load this listing." and Retry |
| Retry | second failure | no | same generic branch | the same card |
| Id change | old request still in flight | yes | abort, result keyed by id | loading card, never the old listing |
| Unmount | request in flight | yes | abort, no state set | nothing |
| Body | missing fields, cleaning 0 or null | yes | dash, "EUR 0" | dashes |
