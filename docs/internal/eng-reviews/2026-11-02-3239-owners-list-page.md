# feat(property-owners): add the owners list page

Pull request: (to be opened)
Issue: #3239
Reviewed commit: uncommitted changes on top of f1ecc9e1a
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/styles/HostOwners.scss | The name cell, a `<th>`, had `display: flex`, which takes it out of the table layout, so on desktop its height and row border could differ from the other cells. | Fixed before commit. The cell keeps normal table layout; the name and the company name are `display: block`, with the same spacing. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/hostowners/services/ownerService.js:45 | Without a sign-in token the client threw a plain `Error` without a status, so the page showed "We could not load your owners" instead of asking the host to sign in again. | Fixed before commit. The client throws an `OwnerApiError` with status 401 and the same message; a page test covers the missing token. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/Pages2.js:63 | `isPurelyPOM` is false until the user context has loaded, so a purely POM member briefly sees the Owners link. A team member with another non-Host role keeps the link. | Accepted. The backend enforces access, and the 403 text "Only hosts can manage owners." is clear. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/hostowners/styles/HostOwners.scss:38 | The button text colour is the literal `#fff`. | Accepted. No shared white token exists; the only white variables are local to other features. |
| P4 (4/10) | frontend/web/src/features/hostdashboard/hostowners/components/OwnersTable.js:13 | `statusClassName` had an unneeded special case for the status value "unknown". | Fixed before commit. The special case is removed. |

## Removed during the review

- The stale-response guard in `HostOwners.js`. It numbered each load and applied a response only if it belonged to the latest load, so a response after unmount or after a newer load was ignored. It is safe to remove: Retry exists only in the error state and disappears while loading, so loads cannot overlap; every load calls the same endpoint; and React 18 ignores a state update after unmount. No test could fail when the guard was broken, so it was code without behaviour to protect.

## Not in scope

- Create, edit, archive and set shares: the next pull requests of #3239.
- Pagination: the API returns the full owner list of a host.
- A route test in `mainDashboardHost.js`: plumbing, covered by the page and sidebar tests.
