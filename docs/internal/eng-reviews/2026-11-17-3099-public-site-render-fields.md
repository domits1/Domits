# #3099 Limit public site data to the fields the templates use

Pull request: `public-site-render-fields`, from `acceptance`.
Issue: #3099
Reviewed: before each commit, then the pull request as a whole, then each guard broken on purpose.
Result: no blocking findings. 9 mutants, all caught. Second review: no defects.

The public render of a live site (`GET /property/website/public/render`) and the static pages send the listing location through one allowlist: `PUBLIC_LOCATION_FIELDS` (`country`, `city`) and `toPublicLocationView` in `util/websitePropertySnapshotView.js`. Every other field is left out, also fields added to the listing later. A missing location stays missing; anything that is not an object becomes `null`. A first version listed the fields to leave out; Karim asked for a list of fields to keep, so nothing new can slip through.

## Who reads the location

| Reader | Fields it reads |
|---|---|
| `buildWebsiteTemplateModel.js` (live site, static pages, editor) | `city`, `country` (no template reads `region`) |
| `websiteHeadTags` | `city`, `country`; its tests already require that the other fields never appear |
| Static pages (`staticPageRenderer.js`) | own payload, same four fields already left out |
| Editor preview | `/property/website/preview`, not this view; unchanged |
| Booking requests and emails | their own data in General-Bookings; unchanged |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (8/10) | `websitePropertySnapshotView.js` | A listing without a location sends `location: null`. | Unchanged, and pinned by a test. |
| P4 (7/10) | `websitePropertySnapshotView.js` | `property_id` also leaves the public location. | Accepted: no template reads it, and the render pin never had it. |
| P4 (6/10) | `websitePropertySnapshotView.test.js` | Checking `view.location` instead of the key let an empty string through. | Covered: an empty location gives `null`; the mutant is caught. |

## Not in scope

- The response of `/property/website/preview`: a separate route, raised with Karim.
- The stored snapshot: it is not public and stays as it is.
