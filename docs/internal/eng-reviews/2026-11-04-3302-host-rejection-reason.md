# feat(propertyhandler): show the host why a listing was rejected, backend (#3302)

Pull request: not opened yet
Issue: #3302
Reviewed commit: `65aa25cb0` plus the uncommitted A1 diff
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (6/10) | propertyService.js:572 | `latestRejection` is a secondary read, but a database error in it fails the whole `hostDashboard/single` response (`await this.getLatestRejection(propertyId)`). A REJECTED listing could then not open in the editor at all. | Accepted for now: the error is loud, and CLAUDE.md says not to swallow errors. FOLLOW-UP: decide in A2 whether the editor should still load without the reason. |
| P3 (4/10) | propertyService.js:572 | The gate reads the status from the first `getBasePropertyInfo`, while `property.status` in the payload comes from a second read. A resubmit between the two reads returns a stale reason next to a non-REJECTED status. | FOLLOW-UP: the frontend (A2) must show the banner only when `property.status` is REJECTED, not on `latestRejection` alone. |
| P3 (5/10) | propertyRepository.js:415 | The repository test asserts the query-builder calls against a mock, so it does not prove the SQL on a live DSQL. | Accepted: the PropertyHandler end-to-end test needs a live database and is excluded in CI. |

## Not in scope

- Listings card and `byHostId`: decided out of scope (option 1). It would need a batched read across listings.
- Public listing route and admin detail route: they must not get this field. Admins get the full history in a separate feature.
- `draftResponseHeaders`: they send `no-store, no-cache, must-revalidate`, so the reason is not cached. Not changed here.
- Rendering the reason: it is free text typed by an admin, so A2 must render it as plain text and never as HTML.
- API Gateway: no new route, so nothing to deploy there.

## What already exists

- `Property_Moderation_Event` and its `(property_id, created_at)` index come from the moderation work. The new query reuses both.
- `transitionStatusWithEvent` writes the status and the event in one transaction, so a REJECTED status always has its event. The null branch is only for rows from before that existed.
- `withDsqlRetry` and the query-builder style are reused from the same repository. Nothing was rebuilt.

## Failure modes

| Path | Failure | Test | Handling | What the host sees |
|---|---|---|---|---|
| getLatestRejection | database error or timeout | no | `withDsqlRetry` retries conflicts, then the error propagates | a failed load, with the existing error message |
| REJECTED, no event row | older data | yes | returns `null` | the status without a reason |
| null reason | older data | yes | passed through as `null` | the status without a reason |
| non-REJECTED status | stale reason shown | yes | no repository call, `null` | nothing |
| actor of the rejection | admin identity leaks | yes | `actorId` is not selected and the mapping is explicit | nothing |

No critical gap: every path has either a test or a visible, loud failure.

## Diagram

```
GET /property/hostDashboard/single
  controller: authorizePropertyOwnerOrCoHostRequest
        ▼
  service.getFullPropertyByIdAsHost
        ├─ status != REJECTED ─▶ latestRejection = null (no query)
        └─ status == REJECTED ─▶ repository.getLatestRejection
                                    ▼
                    { reason, rejectedAt }  or  null
```
