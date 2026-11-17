# #3099 Several properties on one Elite website

Pull requests, merged in order: `elite-site-properties-model` (the list in the draft), `elite-site-properties-render` (snapshots at publish, served at render).
Issue: #3099
Reviewed: every commit before it was made, then a second review of each pull request as a whole, then each guard broken on purpose one at a time.

## The list in the draft (`elite-site-properties-model`)

`siteProperties` is a content override: an ordered list of `{ propertyId, slug }` that must hold the main property when it is not empty. Saving cleans the list and checks the host owns every property in it before anything is stored. Publishing checks every property again. The public render serves the list only to hosts with `website.multi_property`, the same way `sitePages` needs `website.unlimited_pages`.

Mutants: 20, all caught.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (8/10) | `propertyController.js`, `publishWebsiteSite` | The owner check runs before the publish transaction, so a property that changes host in between could still be published. | Closed in `elite-site-properties-render`: the publish transaction checks every listed property again with `FOR UPDATE`, so a concurrent change makes the publish fail and retry. |
| P1 (8/10) | `propertyController.js`, draft and site reads | Hosts without Elite get their own `siteProperties` back in their draft and site responses. | Accepted: it is the host's own draft. Only public responses need the plan, and those filter. `sitePages` works the same way. |
| P2 (8/10) | `websiteSiteProperties.js` | An empty list can be saved. | Accepted on purpose: an empty list means one property, the same as no list. A test pins it. |
| P2 (8/10) | `websiteSiteProperties.editor.test.js` | The tests did not check which token reached the owner check, and the draft fake did not do what the real query does when a save sends no published overrides. | Fixed: the token is asserted on save and publish. The fake now does what `upsertDraft` does: `COALESCE($8, $6)` in `VALUES` makes the new content overrides the published ones, so `EXCLUDED` is never empty. A first correction kept the stored value instead; the second review of the next pull request caught it. Tested: a save without published overrides publishes the checked content overrides. |
| P2 (8/10) | `propertyController.js`, `upsertWebsiteDraft` | The controller calls the draft repository directly. | Not in scope: existing structure, unchanged by this pull request. |
| P2 (7/10) | `propertyController.js`, website errors | A missing main property returns a 500. | Not in scope: existing behaviour. A missing extra property returns a clear 400. |

## Snapshots at publish, served at render (`elite-site-properties-render`)

Every listed property other than the main one is snapshotted when the site publishes, the same way as the main property, but without calendar availability: availability and prices are read live when a guest searches on dates. The snapshots go to the new column `standalone_site.published_site_properties_json` (migration `20261117_standalone_site_property_snapshots`, see `docs/internal/tools/dsql_site_property_snapshots_runbook.md`). The publish transaction checks each of them with `FOR UPDATE` on host and `ACTIVE`. The render reads the snapshots and the live host and status of each property, and serves only the ones that still pass.

```
publish ▶ main snapshot + ACTIVE ▶ list? ─no─▶ the same three statements as before
                                     │yes
                                     ▼ load 4 at a time, no calendar, at most 768 KiB
          transaction: main UPDATE ▶ each extra: SELECT ... hostid, ACTIVE FOR UPDATE ▶ site INSERT
                       ▶ UPDATE published_site_properties_json ▶ outbox ▶ commit (40001 ▶ again)
render  ▶ plan filter ▶ list of 2 or more? ▶ snapshots ∥ live host and status (3 s) ▶ ACTIVE and same host only
```

Mutants: 31, all caught. One first survived: once the publish checks the plan, nothing tested that the render filters by plan on its own; a host who loses the plan after publish now covers it.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | `websiteSitePropertySnapshots.js`, publish | The snapshots came from the full-address read, and the public view copies `location` as it is, so the render served the street, house number and postal code of the other properties. | Fixed: the extras are read with the public location (country and city). Tested on the stored and the served snapshot. |
| P2 (10/10) | `propertyController.js`, publish | A host without the plan who still had a list in the draft got new publish failures: an owner check, and an inactive or missing extra property, for properties his site does not show. | Fixed: the plan is read first. Without it, the list is not checked or snapshotted and the column is left alone. A failed plan read stops the publish with an error instead of publishing without the properties. Tested. |
| P2 (10/10) | `websiteSitePropertySnapshots.js`, render | A republish between reading the site and reading the snapshots could mix two publishes. | Fixed: the snapshots are read at the `static_page_revision` of the site row. On a mismatch, that one render shows the main property. Tested. |
| P3 (10/10) | `websiteSitePropertySnapshots.repository.test.js` | The fake client always answered with a structured result, so dropping the `true` flag would still pass. | Fixed: the flag is asserted on the check and the write. |
| P2 (9/10) | design | The first version loaded every extra property live on every public render. | Replaced: snapshots at publish, one read of the snapshots and one status query at render. A test proves the render loads no listing. |
| P3 (9/10) | `websiteSitePropertySnapshots.test.js` | A missing listing was faked as `null`, while the service returns `{ property: null }`, so a weaker check passed. | Fixed: the fake returns the real shape. The mutant is caught. |
| P3 (6/10) | `directBookingWebsiteSiteRepository.js`, publish check | `FOR UPDATE` next to `hostid` and `status` is not yet proven on this cluster. | The migration file runs it once inside `BEGIN ... ROLLBACK` as a smoke test. |
| P3 (8/10) | `propertyController.js`, render | The plan read and the snapshot read run one after the other, so a slow database can add up to 6 s to a multi-property render. | Accepted: only Elite sites with a list, well within the 29 s of API Gateway. |
| P4 (7/10) | `directBookingWebsiteSiteRepository.js`, publish | A publish that drops the whole list leaves the old snapshots in the row. | Accepted: the render needs the list, so they are never served. A list with only the main property clears them. Tested. |

Outside this change, and raised with Karim: the main property's snapshot is taken with the full address, and the live render serves it through the same view, so live sites already send the street, house number and postal code of the main property in their render data. Changing that changes the render of every existing site.

Why a new column: nesting the extras in `published_property_snapshot_json` needs no migration, but the static page renderer reads that column through a list of keys to strip, so full addresses of the other properties would reach the static pages. The new column is kept out of the shared site columns, so a deploy before the migration breaks nothing; only publishing a list fails until the column exists.

## Not in scope

- Moving the website code in the controller into a business service: a separate refactor, not mixed with behaviour.
- Saving a list without the plan: allowed, the same as `sitePages`. The plan is checked where the list is served.
- The editor preview with several properties, and static pages for them: later pull requests in the plan.
