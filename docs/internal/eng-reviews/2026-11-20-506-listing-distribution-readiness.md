# feat(channex): check whether a listing may turn on distribution (#506)

Pull request: not opened yet
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

## Not in scope

- Loading the listing from the database (property, location, "Guests" detail, pricing): the next step in #506.
- Calling the check from the turn-on route, and returning 404 for a listing that does not exist before calling it: the route step.
- Timezone from the country (D4).
