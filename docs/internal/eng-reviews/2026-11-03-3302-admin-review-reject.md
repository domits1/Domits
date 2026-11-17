# #3302 feat(hostdashboard): reject a listing with a reason from the property review detail page

Pull request: PR 4b, stacked on 4a (approve)
Issue: #3302
Reviewed commit: uncommitted
Result: no BLOCK, no FIX NOW, four follow-ups

| Class | Severity | Where | Finding | Decision |
|---|---|---|---|---|
| FOLLOW-UP | P3 (7/10) | detail/usePropertyReviewDetail.js:23 `setResult({ propertyId, detail: null, error })` | A failed reload after a 409 swaps the page for the error card. `ReviewActions` unmounts, so the typed reason is lost, which 4a only cost the banner. | Accepted. Retry reloads, and the admin retypes the reason. |
| FOLLOW-UP | P3 (8/10) | services/propertyReviewApi.js:61 `failureMessage` | A 400 without a string `message` shows "Property review request failed with status 400" in the dialog. The contract guarantees a message. | Accepted, by decision (1a). |
| FOLLOW-UP | P4 (8/10) | detail/RejectDialog.jsx `<p className={styles.reasonCounter}>` | The counter is not tied to the textarea (`aria-describedby`) and is not a live region, and focus is not restored to the textarea after a failed submit. | Accepted. |
| FOLLOW-UP | P4 (9/10) | detail/ReviewActions.jsx `finish` | The approve success path was moved into a shared `finish` in the same change as the new behaviour. No behaviour change, but it is a refactor inside a behaviour commit. | Accepted: two lines, covered by the approve tests. |

## Not in scope

An admin may reject changed content with an old reason: after `stale_review` the reason is kept, and the notice ("This listing changed since you opened it. Please review it again.") is the only warning. Clearing it would lose work on every small host edit, so the cost is accepted. Server-side length is measured by the server; the client counts UTF-16 units, as `maxLength` does.

## What already exists

`requestPropertyReview` POST support, `useReviewAction` (one instance per action), `ChannexModalShell` with `closeDisabled`, the `host-chdist` wrapper, `chdist-modal__input`, `reload()`, the stale notice and the wrong_status toast: reused.

## Failure modes

| Path | Failure | Test | User sees |
|---|---|---|---|
| Reject | stale_review | yes | banner, dialog closed, reason kept |
| Reject | wrong_status | yes | info toast, reason cleared |
| Reject | 400 | yes | server message, reason kept |
| Reject | 401, 403, 503, 5xx | yes | dialog stays open with the message |
| Reject | double click, Escape, backdrop, close | yes, fails without `closeDisabled` | one request, dialog locked |
| Reject | reason empty, blank or over 500 | yes | Submit disabled |
