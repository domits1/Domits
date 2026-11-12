# feat(property-owners): set the ownership shares of a property from the owner page

Pull request: (to be opened)
Issue: #3239
Reviewed commit: uncommitted changes on top of 2ded7d3f3
Result: no blocking findings

Covers the new form `hostowners/components/SetSharesModal.js` with its tests, the "Set ownership shares" button on `hostowners/pages/HostOwnerDetail.js`, `isConflictError` in `ownerText.js` and the form styles in `HostOwners.scss`. The form uses the share rules from `shareRules.js` and the `hostOwners.shares` texts from the previous pull request; no texts were added. The summary's Close button reuses `form.close`, and each summary line reuses `propertyShare`.

What the form does:

- It opens from the owner detail page, next to Edit. The button is hidden for archived owners and disabled while an archive or restore runs.
- It loads the owners (`listOwners`) and the host's properties (`fetchHostPropertySelectOptions`, called without an argument) at the same time. A load error shows Retry only when `canRetryLoad` allows it.
- When the host picks a property, the rows start from that property's current split, taken from the owners list. The owner of the page is added with an empty share when that owner is selectable and not in the split yet.
- Each row has an owner select and a share. Archived owners are not offered, inactive and pending owners show their status, and an owner chosen in another row is disabled. A comma works as the decimal sign. The total updates while the host types.
- The date is a native date input, from today up to 1826 days ahead, in UTC, and defaults to today.
- Save runs `validateShares` and shows each error next to its field. The first invalid field gets focus. A valid form sends `buildSetSharesPayload` to `setShares`.
- A `409` shows `errorChangedToday` when the chosen date is today and `errorConflict` otherwise. Other errors use `saveErrorText`.
- When the response has upcoming shares, the form shows them under `upcomingTitle` first, and Close or Escape then reports the save. Otherwise the save is reported straight away. The page then closes the form, shows the toast with the property and the date, and loads the owner again.

```
open ──▶ loading ──▶ load error (Retry when canRetryLoad)
            │
            ▼
          form ──Save──▶ validateShares ──errors──▶ form, first invalid field focused
                             │
                             ▼ valid
                         setShares ──error──▶ form with translated server error
                             │
                ┌────────────┴────────────┐
                ▼ upcoming not empty      ▼ upcoming empty
             summary ──Close/Escape──▶ onSaved ──▶ page: toast, owner loaded again
```

Tests: 35 tests in `SetSharesModal.test.js`. They cover:

- the loader and the load errors (Retry on a `500`, none on a `401`)
- the property list with its fallback title, and the rows from the current split
- adding the page's owner, a property without owners, and an archived owner of the page who is not added
- adding and removing rows, disabled duplicate owners, archived owners not offered, and a property change that starts again
- the total: a comma value, 33.33 + 33.33 + 33.34 shown as exactly 100% with no floating-point noise on the way, and a total of 110% that is still shown
- the date limits and the planned-change warning
- the property, date, owner, percent, total and empty-list errors, with `aria-describedby`, focus, and an error that clears once fixed
- the exact payload with a comma value, both save paths with and without upcoming shares, Escape on the summary, a `409` for today and for a later date, a `500` and a `401`
- buttons disabled and Escape ignored while saving, with one request sent
- Cancel, the close button and Escape

`HostOwnerDetail.test.js` has 3 new tests and 1 new check: the button for an active owner and not for an archived one, the form opening and closing, the toast and the second load after a save, and the button disabled while an archive runs. All 463 tests in `hostowners` pass and ESLint is clean.

Mutation checks. Each change below was made on purpose, and at least one test failed for each:

- archived owners offered
- duplicate owners not disabled
- a `409` for today not told apart
- the page's owner never added
- the upcoming summary skipped
- Escape closing while saving
- the payload always using today
- the planned-change warning hidden
- the total stuck at zero
- the first invalid field not focused
- Retry shown on a `401`
- the summary's Close cancelling instead of reporting the save
- the owner not loaded again after a save
- the button shown for archived owners
- the button not disabled during an archive

Two more were added for the total: the total converted from the summed basis points, which is blank above 100%, and the total shown without rounding. The first version of the 33.33 test let the second one through, see the findings.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | backend/functions/property-owners/data/repository.js:108 | Known from the share rules: a save deletes every period of the property from the chosen date on, including changes that were planned earlier. No route returns upcoming shares, so the form cannot show what a save replaces. | Accepted for V1. When a change is planned, the form shows `plannedChangeWarning` with the date it starts. Follow-up: a read route for the current and upcoming shares of one property. |
| P3 (9/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:188 | With today's date, every `409` shows `errorChangedToday`, also when the real cause was a concurrent change. `errorArchivedOwner` is not used: an archived-owner `409` shows `errorConflict`, or `errorChangedToday` for today. | Accepted. Archived owners cannot be chosen in the form, so that `409` only happens when an owner is archived while the form is open. The responses have no error code, and the brief was not to compare English messages. Follow-up: a machine-readable code on the backend `409` and `404` responses. |
| P3 (9/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:186 | A `404` on save shows the owner text ("This owner no longer exists"), also when the property is the one missing. A `400` shows the English server message. | Accepted. This is the same behaviour as the owner form. Same follow-up as above. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:373 | The total is added up row by row instead of converting `shareTotalBasisPoints(rows)` once, because `basisPointsToPercent` returns nothing above 100%. A total of 110% would otherwise be blank. | Accepted. Each row is converted on its own and the sum goes through the language's percent format, which rounds to 2 decimals. Tests cover exactly 100% and 110%. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.test.js:222 | The first version of the 33.33 test also passed when the total was shown without rounding, because 33.33 + 33.33 + 33.34 is exactly 100 in JavaScript. | Fixed. The test first types 0.1 and 0.2, whose sum is 0.30000000000000004, and checks that the total reads 0.3%. The mutation is now caught. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:55 | The date is the UTC date. Around midnight it differs from the host's local date: at 00:30 in the Netherlands the form still offers yesterday's date as today. | Accepted. The backend checks dates in UTC, and the share rules use the same UTC date, so both always agree. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:228 | A row without an owner has the plain "Remove" label, so two empty rows have buttons with the same name. | Accepted. A row only stays empty until an owner is chosen, and validation does not let it through. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/pages/HostOwnerDetail.js:11 | The page imports `utcDateFormatter` from the form component to format the toast date. | Accepted. It is the same as `percentFormatter`, which lives in `OwnersTable.js`. Moving both into `utils/` is a separate refactoring. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/hostowners/components/SetSharesModal.js:459 | The dialog does not keep keyboard focus inside itself. | Accepted. It is the same as the owner form. Follow-up together with the dialog change in the owner detail record. |

## Not in scope

- A machine-readable code on the backend `409` and `404` responses, see the findings.
- A read route for the current and upcoming shares of one property, see the first finding.
- The session refresh from the `3239-owner-session-refresh` branch. On this branch `ownerService.js` still reads the stored token without refreshing it, and so does the shared `fetchHostPropertySelectOptions`.
- The English "Untitled listing" title that the shared property service fills in, recorded with the share rules.
- A focus trap for the owner dialogs.
