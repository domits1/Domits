# Remove unused legacy HostPricing feature

Pull request: #3760
Issue: None
Reviewed commit: `8248537` (acceptance baseline)
Result: no blocking findings; the feature and its dedicated assets are disconnected from the active host dashboard

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (10/10) | `frontend/web/src/App.js:275-278`; `frontend/web/src/features/hostdashboard/mainDashboardHost.js:3,123,175` | The active host dashboard is mounted through `MainDashboardHost`, which imports `Pages2`. Its current pricing surface is `calendar-pricing` → `HostCalendar`; there is no import or route for the legacy `HostPricing` component. The wildcard route redirects unknown dashboard paths to the dashboard root. Repository-wide symbol searches found no external import of `HostPricing`. | Remove the disconnected `hostpricing` feature directory. |
| P3 (10/10) | `frontend/web/src/features/hostdashboard/hostpricing/views/HostPricing.js:2-6` | The detail-view icon, table-view icon and tax-fee icon are imported only by this unreachable feature. The spinner import is shared elsewhere and is not part of this deletion. | Remove only the three dedicated image assets; retain the shared spinner. |
| P3 (10/10) | `frontend/web/src/features/hostdashboard/Pages.js:68,176-182`; `frontend/web/src/App.js:275-278` | The older sidebar still contains a link to `/hostdashboard/pricing`. However, the active dashboard mounts `MainDashboardHost` and uses `Pages2`; its route table has no `pricing` route and redirects unknown paths. The old `Pages.js` is imported by older page components, but those pages are not registered in the current `MainDashboardHost` route table. | Do not keep the unused `HostPricing` feature for this stale link. Record the legacy navigation link as a separate cleanup candidate; do not delete either `Pages.js` or `Pages2.js` here. |

## What already exists

The active host dashboard has a separate pricing surface:

```text
App.js /hostdashboard/*
        |
        v
MainDashboardHost
        |
        +--> Pages2
        |
        +--> /calendar-pricing --> hostcalen/HostCalendar
        |
        +--> /pricelabs -------> hostpricelabs/HostPriceLabs

Legacy hostpricing/views/HostPricing.js
        |
        +--> internal components, hooks, service and styles
        |
        +--> no active dashboard import or route
```

The files inside `hostpricing` form a closed dependency group: `HostPricing.js` imports the feature's hooks and components; the dynamic pricing modal imports its local calendar and price-input components. The details/table view component files are not imported by the page itself (which renders its own JSX).

The VAT/tourist-tax data module is shared with `frontend/web/src/features/bookingengine/ListingDetails.js` and remains in place. The shared `spinnner.gif` asset also remains in place.

## Failure modes

- A hidden static import from another module would cause the frontend build to fail after deletion. Searches for the feature symbol, component names, stylesheet names and dedicated icon filenames found no external code consumers; CI build validation is still required.
- A dynamic string-based reference could evade symbol search. The current active dashboard route table was inspected and does not register `HostPricing`; unmatched dashboard paths use the existing wildcard redirect.
- The stale link in the older `Pages.js` points to a route that is already not registered in the current active dashboard. This PR does not remove that sidebar file or change routing.
- The removal deletes no live request path: the active `calendar-pricing` and `pricelabs` routes use separate modules and are untouched.

There are no feature-specific automated tests to preserve under the directory; its `tests` folder contains only `.gitkeep`. The CI build/test workflow should be checked on this PR. This static review does not claim a local build or runtime test was executed.

## Not in scope

- `frontend/web/src/features/hostdashboard/Pages.js` and `Pages2.js`: leave both navigation components untouched. The current dashboard uses `Pages2`; the older `Pages.js` is still imported by legacy page components. Its stale `/hostdashboard/pricing` link should be considered separately.
- `frontend/web/src/hooks/useSelfLearningPricingModel.js`: separate orphaned hook outside this feature's import graph; review and remove in its own change.
- `frontend/web/src/features/hostdashboard/hooks/usePagination.js`: separate shared hook used by `HostReservations.js`; only the duplicate hook inside `hostpricing` is removed.
- `frontend/web/src/utils/CountryVATRatesAndTouristTaxes.js`: shared by the booking engine.
- `frontend/web/src/images/spinnner.gif`: shared by several dashboard and booking surfaces.
- `hostcalen` and `hostpricelabs`: active pricing functionality; not part of this legacy feature.
- Dependency manifest changes: no packages are removed in this PR. In particular, `@tensorflow/tfjs` remains referenced by the separate `useSelfLearningPricingModel.js` hook.
