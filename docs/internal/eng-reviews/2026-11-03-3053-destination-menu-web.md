# #3053 Show the destinations menu in the header only when it has destinations

Pull request: this one
Issue: #3053
Reviewed commits: c7ad0ecd7, a9f937291, 00f341695, 52c05e731 (the merge of `feature/3053-destination-menu`) and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `feature/3053-destination-menu`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/components/base/Header.js:45 | Every page load now asks `GET /property/destinations/menu`. Until that route exists in API Gateway, the answer is a `403` without a CORS header: no menu, one console warning, a pause of 60 seconds. | Accepted, with an order: merge this branch only after the route is live. The header itself never breaks. |
| P3 (7/10) | frontend/web/src/components/base/Header.js:393 | The trigger appears once the answer is in, so on desktop the search bar moves sideways once. On mobile the second row already exists, so the height stays the same. | Accepted. Reserving the space would show an empty slot while the switch is off. |
| P3 (6/10) | frontend/web/src/features/destinations/components/DestinationsMenu.js:70 | `aria-haspopup="true"` announces a menu, while the panel is a disclosure with links. | Accepted for now, unchanged from the earlier version of the menu. |
| P3 (7/10) | frontend/web/src/features/destinations/services/destinationMenuService.js:1 | The API host is written in the code. | Accepted. The other web services call the same API the same way. |
| P3 (6/10, unsure) | frontend/web/src/features/destinations/services/destinationMenuService.js:56 | The five minutes are counted from the start of the call, not from the answer. | Accepted. The call is aborted after 8 seconds. |
| P3 (8/10) | frontend/web/src/features/destinations/tests/destinationMenuService.test.js | The `503` case had a body without `continents`, so a service that skipped `response.ok` still passed. | Fixed in 00f341695: the `503` now carries a menu in its body. |

## Decisions

- Context: the endpoint answers `{ "continents": [] }` while the SSM switch is off, the menu while it is on, and a `503` when it cannot read the switch or the tree. The header must never wait on it and never break.
- Options: keep the build flag `REACT_APP_DESTINATIONS_MENU` and load on open, or ask once per page load and show the trigger only when there is something to show.
- Choice: the header asks once per page load, in the background, through `useDestinationMenu`. A timeout (8 seconds, aborted), a non-2xx answer, a body without `continents` or a network error all give an empty list, a console warning, and no new call for 60 seconds. A menu is kept for 5 minutes, and the browser may reuse the answer for as long as its `Cache-Control` says. Only paths of the form `/destinations/<slug>` with one to three segments are linked. The build flag is gone, so the SSM switch alone decides.
- Consequences: no menu while the switch is off, while the call runs, or on any failure; the rest of the header renders at once. The four content files carry `title` and `allIn`; a test checks that all four have the same keys and no empty text.

## Not in scope

- The menu endpoint: branch `feature/3053-destination-menu`, merged into this one.
- The API Gateway route `GET /property/destinations/menu`: a live step, not code.
