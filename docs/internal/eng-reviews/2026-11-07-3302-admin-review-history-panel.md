# feat(propertyreview): show the review history on the admin detail page

Pull request: not opened yet (merges after #3802)
Issue: #3302
Reviewed commit: working tree on c1867f515, not committed yet
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | frontend/web/src/features/hostdashboard/propertyreview/detail/reviewHistoryFormat.js:44 `if (!isObject \|\| !ACTION_LABELS.has(entry.action) \|\| !hasValidTime(entry.createdAt)) return null;` | An event with an action the page does not know yet is dropped without a trace, so a new action added to the backend later is invisible until the page learns it. | Accepted: dropping unknown actions was the decided behaviour for this issue. A new action needs a label here anyway. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/propertyreview/detail/reviewHistoryFormat.js:26 `KNOWN_STATUSES.has(status) ? getListingStatusLabel(status) : EMPTY_VALUE` | A status the page does not know shows as a dash. `getListingStatusLabel` alone would have shown a missing status as "Drafted", which is wrong. | Accepted: a dash is the honest value. It is covered by a test for undefined, null, empty and unknown. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/propertyreview/detail/reviewHistoryFormat.js:51 `when.toLocaleString("en-GB", WHEN_FORMAT)` | The time is shown in the time zone of the admin's browser and the zone is not shown, so two admins in different zones read different clock times for one event. | Accepted: the date format is what the issue asks for. The `<time dateTime>` attribute carries the exact instant. |
| P4 (3/10) | frontend/web/src/features/hostdashboard/propertyreview/detail/reviewHistoryFormat.js:30 `const hasActor = actor !== EMPTY_VALUE;` | An actor id that is literally "—" would show as Unknown. Suspicious only; no such id exists. | Appendix only, no change. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| history field | #3802 is not live, so `history` is missing | yes | treated as an empty list | yes, "No review history yet." |
| history field | `history` is not an array (null, string, object) | yes | treated as an empty list | yes, the same text |
| one event | null, number, no time, text time, NaN time, unknown or inherited action ("toString") | yes | the entry is dropped, the others stay | yes, the valid events show |
| one event | no actor id | yes | the event stays, actor shows Unknown | yes |
| one event | reason that looks like HTML | yes | rendered as a React text child, never as markup | yes, shown as typed |
| one event | missing or unknown status | yes | shows a dash | yes |

No critical gap.

## What already exists

- `textOrEmpty` (reviewDetailFormat.js), `EMPTY_VALUE` (reviewQueueFormat.js) and `getListingStatusLabel` (listingStatus.js) are reused; no second text or status helper was written.
- The backend sends the events newest first and at most 50, so the page does not sort or page.
- The api layer returns the body unchanged, so `detail.history` arrives without a change to propertyReviewApi.js or the hook.

## Not in scope

- Approve and reject buttons: #3773 and #3780. This change touches none of the four files they change (PropertyReviewDetailPage.jsx, reviewDetailFormat.js, usePropertyReviewDetail.js, PropertyReviewDetail.module.css). Where the history sits next to the action buttons is decided when the second of them merges.
- Refreshing the history after an approve or reject: it comes with the reload those pull requests add.
- Time zone display: see the P3 finding above.
- Showing the history to the host: the issue is for the admin page only.
