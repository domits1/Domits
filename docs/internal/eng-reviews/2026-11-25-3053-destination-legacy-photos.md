# #3053 Destination pages show the photo of a listing with only legacy images

Pull request: this one
Issue: #3053
Reviewed: the staged diff before each commit, then the whole branch against `acceptance` as a reviewer, then the fix broken on purpose: 5 mutants, all caught (original before web, legacy left out, no folder check, legacy without a fixed order, an original photo that is not READY).
Result: no blocking findings

On `/destinations/europe`, 13 of the 24 listings showed no photo. All 13 have only rows in the legacy `property_image` table; all 11 with a photo have a READY v2 image with a `web` variant. `listActiveListingsUnderPath` read only the second kind, while the listing page falls back to the original variant and to the legacy table.

The query now reads three keys per listing in the same statement: the first READY v2 image with `web`, the first READY v2 image with `original`, and the first legacy key in the listing's own folder, ordered by key. The repository takes the first of the three that lies under `images/<propertyId>/`, so a full address or a key of another folder never becomes a photo.

## What could go wrong, and how it is closed

| Risk | Decision |
|---|---|
| The legacy table has no sort order | `ORDER BY li.key ASC LIMIT 1`: ordered by the key itself, so the same photo comes back every time. |
| A legacy key that is a full address, or outside `images/<propertyId>/` | The legacy query only takes keys in the listing's folder, and every chosen key is checked again before it becomes an address; anything else shows no photo. |
| v2 rows that are not READY, next to legacy images | The v2 keys need READY; the legacy key does not depend on v2, so such a listing shows its legacy photo. The listing page shows the v2 rows in that case. |
| Up to 24 listings per page | One statement with three correlated subqueries, no extra round trips. |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `destinationPageRepository.js` legacy subquery | `LIKE ('images/' \|\| p.id \|\| '/%')` does not escape the property id. | Property ids are UUIDs; a wildcard match is still refused by the folder check, so the worst case is no photo. |
| P3 (6/10) | `destinationPageRepository.js` image subqueries | All three subqueries run for every listing, not only until one answers. | Accepted: at most 24 listings, and the page is cached for 300 seconds. |

Not in scope: the listing page's own fallback, moving legacy images to v2, and a smaller photo than the original for a listing without a web variant.
