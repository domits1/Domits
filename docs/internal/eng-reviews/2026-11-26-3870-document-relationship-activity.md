# feat(orm): add the document_relationship and document_activity tables

Pull request: #4069
Issue: #3870, split PR C (replaces the `document_relationship` and `document_activity` half of #4046)
Reviewed: working tree on `3870-document-links`, on top of acceptance `abdeda890` (contains #4048 and #4055)
Result: no blocking findings

## What changed

```
document  (20261124_document, #4055)
┌──────────────────────┐
│ id, host_id, ...     │
└──────────────────────┘
     ▲             ▲
     │ document_id │ document_id            (logical: no foreign keys)
┌────┴─────────────────────────┐   ┌───────┴──────────────────────────┐
│ document_relationship        │   │ document_activity  (append-only) │
│ id, document_id, host_id,    │   │ id, document_id, host_id,        │
│ entity_type, entity_id ──────┼─▶ │ actor_id, action, details,       │
│ created_by, created_at       │   │ created_at                       │
│ UNIQUE (document_id,         │   │ INDEX (document_id, created_at)  │
│   entity_type, entity_id)    │   │ INDEX (host_id)                  │
│ INDEX (host_id, entity_type, │   └──────────────────────────────────┘
│   entity_id)                 │
└──────────────────────────────┘
entity_type + entity_id name a property, an owner or another entity; the service layer validates them.
```

- Migration `20261126_document_relationship_activity.{js,sql}` and `_rollback.sql` for `test` (suffix `_test`) and `main`. Columns and index names match `3870-document-tables` (#4046). No CHECK constraints, so no negative blocks and no `pg_constraint` query. Smoke blocks per schema: links `...02` and `...03` to two entities, `...04` repeats `...02` with `ON CONFLICT DO NOTHING`, activities `...05` and `...06`, then `relationships_should_be_two` and `activities_should_be_two`. The zero-rows check lists the five ids inserted.
- `Document_Relationship.js` and `Document_Activity.js`: identical to #4046 (blob hashes `296a4d3d` and `0b2b0e68`). Registered in `Tables.js` after `Document_Version`.
- `schema.psql`: both tables for `main` and `test`, after each schema's `document_version` block.
- `dsql_document_relationship_activity_runbook.md`: purpose, DSQL rules, 11 blocks with expected counts, rollback, status. It states that the tables belong to the document tables of `20261124_document` and that the service layer keeps `document_id`, `host_id` and the entity links consistent.
- `documentRelationshipActivityEntity.test.js` (179 lines): data, `describeOrmConsistency`, `itEndsEveryTransactionInRollback`, `itCountsOnlySmokeRowsInFinalCheck`, and the checks specific to this migration. No helper was added to `support/ormConsistencyTestHelpers.js`.
- `2026-11-25-3870-document-core.md`: header line `Pull request: #4055`, at the reviewer's request.

## Tests

- `documentRelationshipActivityEntity.test.js`: 99 tests, all pass. `documentEntity.test.js` 106 and `propertyOwnerEntity.test.js` 96, unchanged.
- Mutation check, each restored byte-identical (blob hash) afterwards. Every mutation made the suite fail: `ON CONFLICT` dropped from the repeated link (1 test), a smoke count filtering on `host_id` (1), id `...06` missing from the zero-rows check (1), the rollback dropping `test` before `main` (1), the second link pointing at the same entity as the first (1).
- Full suite against acceptance `abdeda890` (25 failed suites, 28 failed tests): no new failures. The branch run also failed `taskService.getUploadUrl.signing.test.js`, which passes alone; it is the flaky test seen on #4046, #4048 and #4055. `remoteLockTokenProvider.test.js` fails only in the baseline export, which lacks the frontend file it reads.
- Duplication, token comparison against all 373 `backend/test/**/*.test.js` files: longest match 63 tokens over 8 lines with literals normalized (`:80-87` against `documentEntity.test.js:105-112`, `DROP_SOURCES` and the shared call), 93 tokens over 27 lines with identifiers normalized too (`:8-34`, the import list and the `SCHEMAS`/`TABLES` data shape). Both below the 100-token mark. Migration SQL is excluded from duplication detection since #4055.
- Prettier clean on the new JS files. `Tables.js` already fails Prettier on acceptance; this change adds four lines in the existing style.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `docs/internal/tools/dsql_document_runbook.md:72`, `` `20261124_document_rollback.sql` drops the indexes and then the table, `document_version` before `document` ``, and `:11`, `follow in a separate migration with its own runbook.` | The document runbook does not say that this migration must be rolled back first, and does not link the new runbook. An operator who rolls back only `20261124_document` leaves links and activities that point at no document, with no error. The new runbook says it (Rollback section), but someone working from the document runbook does not see it. | Fixed (A): rollback order and link added to dsql_document_runbook.md. |
| Carried | `20261126_document_relationship_activity.js:45-46`, `CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_created_at_idx${suffix}` / `ON ${schema}.document_activity (host_id, created_at);` | From the #4046 review: a host-wide activity feed in time order would sort every activity row of the host; `(host_id, created_at)` would serve it. | Resolved in the #4069 follow-up: index changed to (host_id, created_at), as asked by both reviewers. |
| Carried | `20261126_document_relationship_activity.js:25-26`, the `(host_id, entity_type, entity_id)` index | From the #4046 review, unverified: a DSQL cap on index key size could be exceeded with multibyte UTF-8. | Appendix, as on #4046: confirm against the DSQL quotas before applying |
| Checked | `documentRelationshipActivityEntity.test.js:102-108`, `expect([lastMain, firstTest]).toEqual([dropped.length / 2 - 1, dropped.length / 2]);` | Fails when a `test` object is dropped before the last `main` object, and when the schemas drop different numbers of objects. | No change |
| Checked | `20261126_document_relationship_activity.sql:121-124`, row `...04` | Without the unique index the repeated link would land and `relationships_should_be_two` read 3, as the runbook says. | No change |

Appendix (3/10): the `sys.jobs` filters at `.sql:20`, `:57` and `:94` use `LIKE` with names that contain `_`, which matches any one character. It can only widen the match to similar names, not hide a job.

## Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| A table already exists with another shape | No (manual) | Runbook block 1, compared in blocks 7 and 8 | Yes, to the operator |
| An `ASYNC` index job fails | No (manual) | Runbook blocks 4, 6 and 8 | Yes, to the operator |
| The unique index is missing or invalid | Yes, the smoke rows and their counts | Runbook block 9: `relationships_should_be_two` reads 3 | Yes, to the operator |
| `20261124_document` is rolled back while these tables hold rows | No | Rollback sections of both runbooks (dsql_document_runbook.md says to roll this migration back first) | Yes, both runbooks state the order; fixed under the P3 finding (A) |

## Not in scope

- Storage, Lambda, owner login and notifications: later PRs, as recorded on #4046.
- Registration in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`: the first Lambda that reads the tables adds them.
- Validating `entity_type` and `action` values: the service layer, which does not exist yet.

## What already exists

- `support/ormConsistencyTestHelpers.js` (#4048) carries every generic check; this suite adds data and the checks specific to this migration only.
- `20261124_document` (#4055) defines the migration, runbook, test and review conventions copied here.
- `property_task_activity`, `home_automation_device_audit` and `property_moderation_event` are per-domain activity tables; `document_activity` follows that pattern.

## Review follow-up (#4069)

- Index: `document_activity_host_id_idx (host_id)` is replaced by `document_activity_host_id_created_at_idx (host_id, created_at)` in the migration `.js`, `.sql` and `_rollback.sql`, `schema.psql`, the test data and the runbook, for `test` (suffix `_test`) and `main`. This resolves the carried `(host_id, created_at)` finding above. The longest new name, `document_activity_host_id_created_at_idx_test`, is 45 characters; the longest name in the migration stays `document_relationship_document_entity_unique_test` and `document_activity_document_id_created_at_idx_test`, 49 characters.
- Key size: the runbook notes the 1 KiB DSQL limit on a secondary index key. `(host_id, entity_type, entity_id)` is 255 + 50 + 255 = 560 characters, up to 2240 bytes with 4-byte UTF-8 characters; real values are about 100 bytes, and the service layer caps `entity_id` (PR D).
- The SQL header comments stay, as the existing convention of `20261016_property_owner.sql` and `20261124_document.sql`.
- Tests: 99, 106 and 96 pass in the three ORM suites. Putting the `(host_id)`-only index back in the `.sql` only fails 2 tests (the index check per schema); the file was restored byte-identical.

Eng-review gate on this diff: no blocking findings.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `20261126_document_relationship_activity.js:21-22`, `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS document_relationship_document_entity_unique${suffix}` / `ON ${schema}.document_relationship (document_id, entity_type, entity_id);` | The unique index can exceed the key limit too: a 16-byte UUID plus 305 characters, up to 16 + 1220 = 1236 bytes. The runbook note names only the host index. The `entity_id` cap in PR D covers both if it is set for the wider of the two keys. | Fixed (A) |
| P3 (9/10) | this file, Findings, the first Carried row (`20261126_document_relationship_activity.js:44-45`, `` `document_activity_host_id_idx${suffix}` ``) | The row quotes the old index name and line text. This section records that it is resolved, but the row itself still reads as an open appendix item. | Fixed: Carried row updated to the new index name and decision. |

## Manual check

<To fill in after applying the migration with the runbook>
