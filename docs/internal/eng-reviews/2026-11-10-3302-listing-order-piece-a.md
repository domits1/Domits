# Sort newly approved listings to the bottom of the by-type and destination feeds (Piece A)

Pull request: #TBD
Issue: #3302
Reviewed commit: staged diff on 9a036ec39, not yet committed (`git diff --cached -- backend` sha256 43a3aa9fac28)
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | propertyRepository.js:337-354, destinationPageRepository.js:81-87 | The sort key is a correlated subquery, so it is evaluated for every candidate row before `LIMIT` can cut. Cost grows with the number of active listings of one type or under one path, not with the limit of 12 or 24. Each lookup is cheap: it uses the `(property_id, created_at)` index. | Accepted. Volumes are small today. Revisit if one type or path holds thousands of active listings. |
| P3 (7/10) | propertyRepository.activeByType.test.js, destinationPageRepository.test.js | The tests prove the right methods and SQL text, not that rows come out in order. The real generated SQL was checked once without a connection (entity metadata plus `getQueryAndParameters`), and a manual smoke script covers real ordering, but neither is committed. | Accepted. CI has no database, same reason `end-to-end.test.js` is excluded. The mutation check shows the tests fail when the ORDER BY is reverted. |
| P3 (5/10) | propertyRepository.js:104, propertyRepository.js:148 | `updatePropertyStatus` and `transitionStatus` accept any status and write no moderation event. Today `propertyService.js` limits `updatePropertyStatus` to INACTIVE and ARCHIVED, and `transitionStatus` has no non-test caller. A future caller that sets ACTIVE through either would put a listing at the top of every feed with no APPROVED event. | Not in this diff. Follow-up: remove `transitionStatus` (already scheduled in the 2026-11-04 review) and consider rejecting ACTIVE in the repository method itself. |
| P4 (5/10) | destinationPageRepository.test.js (the `oneLine(statement)` assertion for `p.createdat DESC, p.id ASC LIMIT $4`) | A weakened check: the text also appears in the old query, so the assertion passed on broken or unchanged behaviour. Found in the staged-diff review, before the commit. | Fixed before commit: removed rather than kept. The ordering test below it is the real check. |

### Appendix (confidence 3-4)

- (4/10) propertyRepository.js:345: the `property_type` join is not schema-qualified (generated SQL: `INNER JOIN "property_type" "pt"`). It is unchanged by this diff and the query works today. Noted because the 2026-11-04 review found unqualified SQL resolving to `public`.
- (4/10) Approval time is the latest APPROVED event. A listing that was archived or rejected and approved again gets a new, later time and sinks to the bottom again. This follows the stated rule, but Stefan should confirm it is the intent.

## Loophole check: can an ACTIVE property exist without an APPROVED event?

Not through any code path. Searched `backend/` (functions, ORM, events) for every writer of `property.status`:

- Create: `propertyBuilder.js:55` sets `propertyParams.status = "INACTIVE"`, whatever the request body says. The `"status": "ACTIVE"` in `events/PropertyHandler/post.js` is overwritten.
- Host request for ACTIVE: `requestHostStatusChange` turns it into `PENDING_REVIEW` with a SUBMITTED event.
- Going live: only `reviewPendingProperty` through `transitionStatusWithEvent`, which updates the status and inserts the event in one transaction.
- Other `.update(Property)` calls in `propertyRepository.js` write overview fields or the registration number, not the status.
- No other function writes `Property` (the others only read it), and no raw `UPDATE ... property` exists outside the repository.

What remains is data, not code: pre-#3302 listings, and manual edits in the database. Both sort to the top, which is the intended treatment of established listings.

## Not in scope

- Piece B: the paginated feeds (`getActiveProperties`, by-country). They need a cursor change. Deferred by Stefan's request.
- Performance ranking. Explicitly deferred.
- ADR: sort key. Context: new listings should not outrank established ones. Options: `updatedat` (overwritten by any edit), `createdat` (says nothing about approval), latest APPROVED event. Choice: latest APPROVED event, `COALESCE(..., 0)` so listings without one sort first. Consequence accepted: a re-approval resets the position.
- A shared helper for the subquery. Two different query styles (query builder and raw SQL) use it once each, so there is no repetition to extract.

## What already exists

- `Property_Moderation_Event` entity and the `(property_id, created_at)` index, from the moderation event migration. Reused, not rebuilt.
- The `getLatestRejection` query (`propertyRepository.js`) as the pattern for querying the event table with the entity.
- `resolveSchemaName` in `destinationPageRepository.js`, reused for the schema prefix.

## Failure modes

| Path | Failure | Test | Handling | What the user sees |
|---|---|---|---|---|
| Both queries | `property_moderation_event` missing in the schema | No | No | An error response from the by-type endpoint and the destination page. Mitigated: the table ships with the moderation migration already used by the admin history panel. |
| Both queries | Property with no APPROVED event | Yes (COALESCE and the shape are asserted) | Yes (`COALESCE(..., 0)`) | Listing appears first. |
| byType | Subquery text changes how TypeORM resolves `property.id` | Partly (mock) | Verified once against generated SQL | Wrong or failing query. Caught by the out-of-band SQL print, not by CI. |
| Destination | Property mapped to several destinations | Unchanged by this diff | No | Not new. |

No critical gap: nothing fails with no test, no handling and no visible symptom.

## Sort key

```
  property row
       │
       ▼
  latest APPROVED event ──none──▶ 0 ─┐
       │                              │
       ▼                              ▼
  MAX(created_at) ───────────▶ approved_at ASC ──tie──▶ createdat DESC ──tie──▶ id
                                (no event first,         (byType: id DESC,
                                 oldest approval next)    destination: id ASC)
```

## Verification

- Tests written first and red for the right reason: 4 of 8 new byType tests and 1 destination test failed before the change.
- Mutation check on both files (backup copy, sha256 before and after, no git checkout): reverting the ORDER BY fails one test in each suite, and restoring gives an identical hash.
- Real generated byType SQL: `ORDER BY approved_at ASC, "property"."createdat" DESC, "property"."id" DESC` with `(SELECT COALESCE(MAX("event"."created_at"), 0) FROM "test"."property_moderation_event" ...)`.
- Manual smoke script for the `test` schema written, not run.
