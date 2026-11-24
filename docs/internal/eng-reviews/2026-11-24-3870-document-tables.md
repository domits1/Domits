# feat(orm): add document tables, entities and consistency tests

Pull request: (to be opened)
Issue: #3870 (Host Dashboard: Owner Management: Portal: Documents), PR 1 of the shared Document Lifecycle Management (DLM) service
Reviewed: staged diff on `3870-document-tables`, on top of `e9c1a1473` (acceptance)
Result: no blocking findings

## What changed

```
                         document  (one row per document, scoped by host_id)
                ┌──────────────────────────────────────────────┐
                │ id, host_id, title, category, status,         │
                │ visibility, review_status, issue_date,        │
                │ expiration_date, archived_at, deleted_at      │
                │ current_version_id ─────────────┐             │
                └──────────────────────────────────┼────────────┘
                     ▲             ▲               │        ▲
         document_id │ document_id │               ▼        │ document_id
┌────────────────────┴──┐ ┌────────┴────────────────────┐ ┌─┴──────────────────────┐
│ document_relationship │ │ document_version            │ │ document_activity      │
│ entity_type,entity_id │ │ version_number >= 1         │ │ actor_id, action,      │
│ unique per document   │ │ file_size > 0, storage_key  │ │ details, created_at    │
│ and entity            │ │ unique (document, version)  │ │ append-only            │
│                       │ │ immutable: no updated_at    │ │                        │
└───────────────────────┘ └─────────────────────────────┘ └────────────────────────┘

All arrows are logical: no foreign keys. The service layer keeps them true.
host_id is on every table, so each is host-scoped without a join.
```

- Migration record `20261124_document.js` (`Document20261124`), the hand-run `20261124_document.sql` and `20261124_document_rollback.sql`, in both `test` (suffix `_test`) and `main`. Same structure as `20261016_property_owner`: pre-flight, DDL per schema with a `sys.jobs` check, catalog checks, smoke blocks in `BEGIN ... ROLLBACK`, four negative blocks for the two CHECK constraints (SQLSTATE 23514), zero-rows check.
- Four EntitySchemas in `backend/ORM/models/` built with the `modelSchemaUtils.js` helpers, registered in `backend/ORM/util/database/Tables.js` after `Property_Owner_Property`.
- `schema.psql`: the four tables for `main` and `test`, each placed after the schema's `property_owner_property` block.
- `docs/internal/tools/dsql_document_runbook.md`: purpose, DSQL rules, blocks with expected results, rollback, status.
- Nothing reads or writes the tables yet. TypeORM runs with `synchronize: false`.

## Tests

`backend/test/ORM/documentEntity.test.js` (182 tests) follows `propertyOwnerEntity.test.js`. It fails if any of these drift from each other: the entities, `schema.psql`, the `.sql` and the `.js` `up()`/`down()`. It covers every column, type, nullability and length, every index (unique flag, key columns), the two named CHECK constraints, no foreign keys, the defaults (`status` `active`, `visibility` `internal`), no `updated_at` on `document_version`, and drops ordered index before table and main before test. It also checks that every index and constraint name fits the 63-character PostgreSQL identifier limit and is unique, that each smoke query filters on what it claims, that each CHECK is tried in its own rolled back block, that there is no `COMMIT`, and that the zero-rows check lists every smoke id.

The suite failed (modules missing) before the models and migration existed, and passes with them.

## Full suite

`npm test` in `backend`, staged diff against a clean `acceptance` run at `e9c1a1473`:

| | acceptance | staged |
|---|---|---|
| Suites | 19 failed, 468 passed | 19 failed, 469 passed |
| Tests | 28 failed, 6858 passed | 28 failed, 7040 passed |

The same 19 suites fail on both. No new failures. `test/ORM`: 12 suites pass, 1 fails (`directBookingWebsiteRatePlan.schema.test.js`, which fails the same way on acceptance and asserts on its own migration file).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `backend/test/ORM/documentEntity.test.js:114-195` (`const createTableBlock = (sql, qualifiedTable) => {` at `:140`) and `backend/test/ORM/propertyOwnerEntity.test.js:67-148` (same line at `:93`) | The SQL-parsing helpers (`readOrmFile` through `dropStatements`, about 80 lines) are copied verbatim from the owner test. `schemaSql.js:14` (`export const extractCreateTableBlock = (sql, qualifiedTable) => {`) is a third, slightly different extractor. A fix to one parser will not reach the others. | Accepted for this PR. A follow-up refactor PR moves the shared helpers into `test/ORM/schemaSql.js`. |
| P2 (6/10) | `backend/ORM/migrations/20261124_document.js:38-39`, `CREATE INDEX ASYNC IF NOT EXISTS document_host_id_expiration_date_idx${suffix}` / `ON ${schema}.document (host_id, expiration_date);` | The expiration index leads with `host_id`, so it serves "expiring documents of one host". A scheduled reminder sweep across all hosts (the pattern of the property-tasks sweeps) filters on `expiration_date` alone and cannot use it. Could be a false positive: no sweep is designed yet. | Accepted as is. The PR that introduces the reminder sweep adds an `(expiration_date)` index. |
| P3 (5/10) | `backend/ORM/migrations/20261124_document.js:105-106`, `CREATE INDEX ASYNC IF NOT EXISTS document_activity_host_id_idx${suffix}` / `ON ${schema}.document_activity (host_id);` | A host-wide activity feed ordered by time would read and sort every activity row of the host. `(host_id, created_at)` would serve it. No reader exists yet. | Appendix: decide with the first reader |
| P3 (5/10) | `backend/ORM/migrations/20261124_document.js:52`, `checksum VARCHAR(128) NULL,` | No record of the checksum algorithm. If it ever changes, stored values become ambiguous. | Appendix: the service layer fixes the algorithm, or stores a prefixed value |
| P3 (4/10) | `backend/ORM/migrations/20261124_document.js:48`, `storage_key VARCHAR(1024) NOT NULL,` | Not unique. Two versions pointing at the same object would let removing one version's file remove the other's. Key generation (a fresh UUID per upload, as in `taskAttachments.js`) prevents it in practice. | Appendix |
| Unverified (3/10) | `backend/ORM/migrations/20261124_document.js:81-82` and the `(host_id, entity_type, entity_id)` index | Aurora DSQL may cap the byte size of an index key. With multibyte UTF-8 the widest key (255 + 50 + 255 characters) could exceed a small cap. I could not quote the DSQL quota, so this stays unverified. `property_owner_property` has a key of similar width and applied cleanly. | Appendix: confirm against the DSQL quotas before applying |
| Checked | `20261124_document.sql`, rows `...04` and `...06` | Without the two unique indexes the `ON CONFLICT DO NOTHING` inserts would land and `versions_should_be_two` / `relationships_should_be_two` read 3, as the runbook says. With them, 2. | No change |
| Checked | `documentEntity.test.js`, name length test | The longest name, `document_version_document_id_version_number_unique_test`, is 55 characters. `document_relationship_document_id_entity_type_entity_id_unique_test` would have been 67 and silently truncated; the shortened `document_relationship_document_entity_unique` is used. | No change |
| Checked | `Tables.js` | Registration only adds entities. The test builds metadata for the full `Tables` list, so a name collision would fail it. | No change |

## Architecture decision: polymorphic document links without foreign keys

- Context: DLM is shared. The Owner Portal is the first consumer; properties, owners, bookings and others will follow. Aurora DSQL supports foreign keys, but the repo keeps them out (see `dsql_property_owner_runbook.md`) so shared tables keep their delete behaviour.
- Options: (a) one link table per entity type with a typed column; (b) a nullable column per entity type on `document`; (c) one `document_relationship` table with `entity_type` + `entity_id`.
- Choice: (c). A new consumer needs no DDL, only a new `entity_type` value validated in the service layer.
- Consequences accepted: the database cannot check that `entity_id` exists or belongs to the same host; `entity_id` is a string for every type; a deleted entity leaves dangling links until the service cleans them up. The service layer must scope every link read by `host_id`.

## Failure modes

There is no runtime code path yet. These are the failure modes of applying and first using the schema.

| Failure | Test | Handling | Visible |
|---|---|---|---|
| A table already exists with another shape; `CREATE TABLE IF NOT EXISTS` skips it silently | No (manual) | Runbook block 1 pre-flight, blocks 7 to 9 compare shape | Yes, to the operator, if block 1 is not skipped |
| An `ASYNC` index job fails and the index stays invalid | No (manual) | Runbook blocks 4, 6 and 8 (`indisvalid`) | Yes, to the operator |
| A CHECK constraint is missing | Yes, the shape is asserted in all three sources | Runbook block 12 negative inserts | Yes, `INSERT 0 1` instead of 23514 |
| Warm Lambdas fail one statement with `40001`/`OC001` after the DDL | No | Runbook asks for a quiet window; callers using `withDsqlRetry` retry | Possibly a single 500 to a user |
| A first consumer is deployed before the migration is applied | No | Runbook order: apply before any reader ships | Generic 500 from the consumer (`relation does not exist`). Not critical today, because nothing reads the tables |

## Not in scope

- File storage (bucket, CORS, encryption, IAM), the DLM Lambda, API Gateway: later PRs.
- Owner login and the owner-facing access model: no Owner Portal or owner identity exists yet (`property_owner.owner_user_id` is always null).
- Category, status, visibility, review status, entity type and action lists: service layer, no CHECK, by design.
- Registration in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`: the first Lambda that reads these tables through that package adds them.
- Expiry reminders and notifications: no scheduler or owner notification exists; see the P2 index finding.
- Retention and hard delete of `deleted_at` documents and their files.
- Malware scanning and server-side MIME verification of uploaded files.
- `schema.psql` is missing many tables of other teams (for example `property_task`, `team_member`); not this change's to fix.

## What already exists

- `property_owner` / `property_owner_property`: the conventions copied here (migration shape, runbook, no FK, CHECK only on fixed rules, `_test` suffix).
- Property-task attachments store S3 keys as a JSON string on `property_task.attachments`; this change gives documents their own tables instead of reusing that column pattern.
- `property_task_activity`, `home_automation_device_audit`, `property_moderation_event`: per-domain activity tables. `document_activity` follows that repo pattern instead of introducing a shared audit table.

## Manual check

<To fill in after applying the migration with the runbook>
