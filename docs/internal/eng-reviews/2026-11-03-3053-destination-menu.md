# #3053 Serve the destination menu behind the destination pages switch

Pull request: this one
Issue: #3053
Reviewed commits: 31cbc5dd5 (the merge of acceptance), 9feda1daf, 547190958, 053fa0001, 3ed46f4b2 and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `acceptance`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | backend/functions/PropertyHandler/business/service/destinationPageService.js:87 | A failed menu answer builds the HTML unavailable page, which the JSON 503 of the menu does not use. | Accepted. It keeps one answer path for the switch, the time limit and the failure, shared with the pages. |
| P3 (8/10) | backend/functions/PropertyHandler/business/service/destinationPageService.js:86 | A menu failure is logged as `Destination page unavailable:`, so the logs do not tell the menu from the pages. | Accepted. Both come from the same switch and tree, so one failure count is what the live watch needs. |
| P3 (6/10, unsure) | backend/functions/PropertyHandler/business/service/destinationMenuBuilder.js:23 | The menu is built again on every request from the cached tree, with one filter per parent, and has no size limit like the sitemap. | Accepted. About 80 destinations today; the tree read is cached for a minute and the answer for five minutes in the browser. |
| P3 (9/10) | backend/functions/PropertyHandler/business/service/destinationTreeService.js:112 | `listEligibleDestinations` has no caller left outside its test. It had none on acceptance before this change either. | Accepted. Removing it is a cleanup of its own. |
| P3 (8/10) | backend/functions/PropertyHandler/business/service/destinationMenuBuilder.js:23 | With `DESTINATION_PARENT_FROM_ANY_CHILD=false` countries and continents usually have no page, so the menu is empty while the root page still names them. | Accepted. The Lambda sets no `DESTINATION_*` variable, so the default (`true`) applies, and an empty menu never links to a `404`. |

## Decisions

- Context: the destination pages are live in AWS behind the SSM switch `/destinations/pages/enabled`, which is still `false`. The menu must follow the same switch, through the same cached reader.
- Options: keep the menu in `PropertyController` with its own switch read, or serve it from `DestinationPageService` next to the pages and the sitemap.
- Choice: `DestinationPageService.serveMenu` uses the same `answer` path as the pages: the switch is cached for a minute, everything has a limit of 5 seconds, and a failure is logged. The controller answers `{ "continents": [] }` with `public, max-age=60` while the switch is off, the menu with `public, max-age=300` while it is on, and a JSON `503` with `no-store` and `Retry-After: 60` when the switch or the tree cannot be read, the same status as the pages.
- Consequences: one instance holds the switch and the tree for pages, sitemap and menu, so they cannot disagree. The menu lists only destinations the page route serves (the sitemap's check, `servesPage`), so it never links to a path the route refuses.

## Not in scope

- The header that shows the menu: branch `feature/3053-destination-menu-web`, built on this one.
- The API Gateway route `GET /property/destinations/menu`: a live step, not code.
