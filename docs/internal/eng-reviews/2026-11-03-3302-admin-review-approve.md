# #3302 feat(hostdashboard): approve a listing from the property review detail page

Pull request: PR 4a, stacked on 3a (Reject is 4b)
Issue: #3302
Reviewed commit: uncommitted
Result: no BLOCK, one FIX NOW (fixed), three follow-ups

| Class | Severity | Where | Finding | Decision |
|---|---|---|---|---|
| FIX NOW | P2 (9/10) | detail/ApproveDialog.jsx:12 `host-chdist ${styles.dialogScope}` | `--chdist-primary` lives on `.host-chdist` (HostChannelDistribution.css:1). Without that ancestor the confirm button had no background: white text on a white card. Jest does not evaluate CSS. | Fixed: wrapper added, `display: contents` drops its page padding. |
| FOLLOW-UP | P3 (7/10) | detail/useReviewAction.js:27 `if (!failed) onSuccess();` | No unmount guard: leave the page mid-request and a success still toasts and navigates. | Accepted; the dialog blocks Escape and close while submitting. |
| FOLLOW-UP | P3 (8/10) | detail/usePropertyReviewDetail.js `setResult({ propertyId, detail: null, error })` | A failed reload after a 409 swaps the page for the error card and drops the banner. Retry works. | Accepted. |
| FOLLOW-UP | P4 (7/10) | services/propertyReviewApi.js `REQUEST_TIMEOUT_MS` | A timed-out POST may have been applied; the next try returns wrong_status. | Accepted: no automatic retry, by decision. |

## Not in scope

Reject, textarea, counter and the 400 message in the dialog: 4b. A missing `updatedAt` is not guarded; the server always sends it.

## What already exists

`requestPropertyReview`, `ChannexModalShell`, `chdist-*` buttons, `retryButton`, `LISTING_STATUS`, the 401 and 403 texts: reused.

## Failure modes

| Path | Failure | Test | User sees |
|---|---|---|---|
| Approve | stale_review, wrong_status | yes | banner, or toast and no action bar |
| Approve | 401, 403, 503, unknown 409 | yes | dialog stays open with the message |
| Approve | double click | yes, fails without the guard | one request |
