# feat(property-owners): add the owner form modal

Pull request: (to be opened)
Issue: #3239
Reviewed commit: uncommitted changes on top of da8dcae0e
Result: no blocking findings

Covers `hostowners/components/OwnerFormModal.js`, the Add owner and Edit actions in `HostOwners.js` and `OwnersTable.js`, the new texts in `content/{en,nl,de,es}.json` and the styles in `HostOwners.scss`.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/styles/HostOwners.scss:3 | Field errors and the form alert only used the text colour, so they did not stand out. | Fixed before commit. Feature-local variables `$host-owners-error` (`#c0392b`) and `$host-owners-error-bg` (`#fff5f5`), the same values other host features use, colour the field errors, the invalid field border and the form alert. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/components/OwnerFormModal.js:153 | `<dialog open aria-modal="true">` is not truly modal: Tab can move focus to the page behind it, and focus does not return to the button that opened it. | Accepted. HostTeam uses the same pattern. Follow-up: open the dialog with `showModal()`. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/hostowners/pages/HostOwners.js:25 | A new owner is added at the end of the list, while the API sorts by last name. | Accepted. The order is restored on the next load. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/hostowners/styles/HostOwners.scss:258 | The overlay colour is the literal `rgba(0, 0, 0, 0.4)`. | Accepted. No shared token exists; HostTeam and the task modals use the same value. |
| P4 (4/10) | frontend/web/src/features/hostdashboard/hostowners/pages/HostOwners.js:38 | The response of a successful save is put into the list without a check. | Accepted. `ownerService` already rejects an unreadable response body. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/hostowners/components/OwnerFormModal.js:65 | Sonar flagged the unused `_removed` variable used to drop a field error. | Fixed before commit. The error is removed with a filter; the behaviour is the same. |

## Fixed after manual testing

- The overlay was behind the fixed site header (`z-index: 1200`). It now uses `z-index: 2000`, like the HostTeam invite modal.
- The Add owner button and the right edge of the table were cut off at the screen edge. The page now has `16px` padding, like Listings.
- The modal was taller than the screen, so Save and Cancel were only reachable by scrolling. The dialog is limited to the viewport, the form body scrolls, and the header and the buttons stay visible.
- A close button (×) with the translated label "Close" was added to the header. It calls the same close action as Cancel and is disabled while saving.

## Not in scope

- Archive and set shares: the next pull requests of #3239.
- Translating the backend's 400 messages: they are shown as the backend sends them.
- Sorting the list on the client.
