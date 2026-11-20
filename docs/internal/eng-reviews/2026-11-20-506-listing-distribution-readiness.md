# feat(channex): check whether a listing may turn on distribution (#506)

Pull request: #3981
Issue: #506
Reviewed commit: 2f6eb3296
Result: no blocking findings

The rule comes from D3 in `docs/partner/integrations/channel_manager/channex/channex_host_self_distribution_design.md`: only a live listing with an address, max guests and a price may turn on distribution.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `listingDistributionReadiness.js:14` | `const LIVE_STATUS = "ACTIVE";` copies `PROPERTY_STATUS.ACTIVE` from `PropertyHandler/util/propertyStatus.js:4`. A rename in one place would leave the other stale. | Accepted: `.shared` cannot import from a function directory, because each Lambda is bundled on its own. |
| P3 (6/10) | `listingDistributionReadiness.js:19` | The number checks are strict: a string `"4"` would count as missing guests. The columns are `int` (`Property_General_Detail.js:21-22`, `Property_Pricing.js:17-18`), so the driver returns numbers today. | Kept strict. The data-layer step adds a test that `guests` and `roomRate` arrive as numbers. |
| P3 (5/10) | naming | "readiness" already means "mapping ready to sync" in `channexFullSyncService.js:397` (`readinessResult`). | Accepted: the full name `listingDistributionReadiness` keeps the two apart. |

## Findings on the data layer (listingDistributionRepository, 20 Nov)

Reviewed on the staged diff before the commit; also covers the separate refactor that exported `qualifyTableName`.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `channexAriPayloadUtils.js:30` | `qualifyTableName` is now exported and reused, but two more copies remain in `.shared/channelManagement` (`channexBookingAvailabilityBridge.js:39`, `channexExternalBookingImportRepository.js:28`). | Accepted: this change only stops a fourth copy; folding the other two in is a separate cleanup. |
| P3 (5/10) | `listingDistributionRepository.js:24-25` | `property_generaldetail` has no unique key on (`property_id`, `detail`) (`Property_General_Detail.js`: only `id` is primary). Two "Guests" rows would give two joined rows, and `LIMIT 1` without `ORDER BY` picks one at random. Location and pricing are safe: `property_id` is their primary key. | Accepted for readiness: it only checks that guests is above 0, and PropertyHandler reads the first "Guests" row the same way (`websiteQuoteService.js:289`). Revisit in provisioning (D2), where the guest count is sent to Channex as occupancy. |
| P3 (6/10) | `listingDistributionRepository.js:36` | `hostId` is returned but not checked here. | By design: the owner check belongs in the controller of the turn-on route, like `checkPropertyOwner` for mappings. |

Tests: one per path (found, not found, numeric strings, missing joined rows, the SQL and its parameter). The query is parameterised (`$1`), so the id cannot inject SQL.

## Not in scope

- Calling the check from the turn-on route, and returning 404 for a listing that does not exist before calling it: the route step.
- Timezone from the country (D4).
