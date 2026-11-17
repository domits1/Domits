# feat(property): record review history and require a reason to reject (#3302)

Pull request: #3745
Issue: #3302
Reviewed commit: ad10af3fb
Result: 1 blocking, all fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | propertyRepository.js, transitionStatusWithEvent | The read of the current row was raw SQL without a schema, while the UPDATE and INSERT go through the query builder and use the entity schema. With a configured schema the read could hit another table than the write. | Fixed: the read now uses the manager query builder on the Property entity. A test asserts it no longer uses raw SQL. |
| P4 (6/10) | propertyService.js, requestHostStatusChange | A default parameter sat before a required one (Sonar). | Fixed: signature is now (propertyId, requestedStatus, { metadata = {}, actorId } = {}), callers and tests updated. |

## Not in scope

- The archive metadata helpers (getArchiveMetadataColumns, clearArchiveMetadata) still use unqualified raw SQL, as they did before this pull request.
