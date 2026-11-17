# #3099 Limit public site data to the fields the templates use

Pull request: `public-site-render-fields`, from `acceptance`.
Issue: #3099
Reviewed: before each commit, then the pull request as a whole, then each guard broken on purpose.
Result: no blocking findings. 3 mutants, all caught.

The public render of a live site (`GET /property/website/public/render`) sends the listing location through `toPublicWebsitePropertySnapshotView`. It now leaves out `street`, `houseNumber`, `houseNumberExtension` and `postalCode`, the same fields the static pages already leave out. The list lives in one place, `PRIVATE_LOCATION_FIELDS` in `util/websitePropertySnapshotView.js`, and the static page renderer imports it.

## Who reads the location

| Reader | Fields it reads |
|---|---|
| `buildWebsiteTemplateModel.js` (live site, static pages, editor) | `city`, `country` |
| `websiteHeadTags` | `city`, `country`; its tests already require that the other fields never appear |
| Static pages (`staticPageRenderer.js`) | own payload, same four fields already left out |
| Editor preview | `/property/website/preview`, not this view; unchanged |
| Booking requests and emails | their own data in General-Bookings; unchanged |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (8/10) | `websitePropertySnapshotView.js` | A listing without a location sends `location: null`. | Unchanged, and pinned by a test. |

## Not in scope

- The response of `/property/website/preview`: a separate route, raised with Karim.
- The stored snapshot: it is not public and stays as it is.
