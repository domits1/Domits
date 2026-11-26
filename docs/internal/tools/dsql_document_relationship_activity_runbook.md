# Document relationship and activity tables (2026-11-26)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3870, Owner Portal documents, the first part of the shared Document Lifecycle Management service):

- `20261126_document_relationship_activity.{js,sql}` and `20261126_document_relationship_activity_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run. It opens with a short comment header that repeats the run order, as the document migration does.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md). Confirm the cluster from SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1, and apply as the `admin` database user the runtime uses (`backend/ORM/index.js`).

These two tables belong to the document tables of `20261124_document` ([dsql_document_runbook.md](./dsql_document_runbook.md)). Apply that migration first. Neither table here depends on it in the database, but a link or an activity only has meaning for an existing document.

## Purpose

- `document_relationship`: one row per link between a document and another entity, such as a property or an owner. `entity_type` names the kind of entity and `entity_id` its id; the table does not know the entity tables. `host_id` is the host who manages the document.
- `document_activity`: the activity log of a document, one row per action. `actor_id` is who acted, `action` what happened, and the optional `details` holds extra text. Rows are append-only: there is no `updated_at`, and a correction is a new row.

Indexes:

- `document_relationship_document_entity_unique`: one link per document and entity.
- `document_relationship_host_id_entity_idx`: the documents of a host linked to one entity.
- `document_activity_document_id_created_at_idx`: the activity of a document in time order.
- `document_activity_host_id_idx`: a host's activity.

## Prerequisites

- An admin session on the right cluster, confirmed from SSM as above.
- A quiet window. Every DDL commit and index activation bumps the catalog version, and warm Lambdas fail their next statement once with SQLSTATE `40001` / `OC001`. This applies to `test` too.
- Neither table exists yet in either schema (block 1), and no index job on them is in flight (block 2).

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own in autocommit, never inside `BEGIN`. The `BEGIN` blocks in the file contain DML only.
- Indexes are `CREATE [UNIQUE] INDEX ASYNC`. Wait until every job in `sys.jobs` reads `completed` and every index shows `indisvalid = t` before any smoke block runs. Without the unique index, the repeated link would be inserted and `relationships_should_be_two` would read 3. `sys.jobs` forgets finished jobs after about 30 minutes.
- **No CHECK constraints.** `entity_type` and `action` are lists that may grow; the service layer validates them.
- **No foreign keys**, as for the document tables. The service layer keeps `document_id` pointing to a `document`, `host_id` equal to that document's `host_id`, and `entity_type` and `entity_id` pointing to an entity of the same host.
- Index names carry a `_test` suffix on `test`, and every name fits the 63-character PostgreSQL identifier limit.

## Blocks in the file, in order

1. Pre-flight on `information_schema.tables`: expect no row. An existing table would be skipped silently by `CREATE TABLE IF NOT EXISTS`; stop and compare it with blocks 7 and 8.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job whose `object_name` contains `document_relationship` or `document_activity`.
3. `test` schema: `test.document_relationship` and its two indexes, then `test.document_activity` and its two indexes, each statement on its own.
4. Re-run the `sys.jobs` query on `test.document_relationship%` and `test.document_activity%` until all four index jobs read `completed`. A `failed` job leaves its index invalid: drop that index and run its statement again.
5. `main` schema: the same two tables and four indexes, without the suffix.
6. Re-run the `sys.jobs` query on `main` until all four jobs read `completed`.
7. Columns: 28 rows, 14 per schema (7 for each table). Nullable is only `document_activity.details`. No column has a default other than `id`.
8. Indexes: 12 rows, 6 per schema (two primary keys and four indexes), all `indisvalid = t`. `indisunique = t` only on the primary keys and `document_relationship_document_entity_unique`.
9. Smoke test on `test`, one `BEGIN ... ROLLBACK` block. Two links of the smoke document to different entities, then the first link again (row `...04`, `ON CONFLICT DO NOTHING`), which reports `INSERT 0 0`. Two activity rows. Then `relationships_should_be_two` = 2 and `activities_should_be_two` = 2.
10. Smoke test on `main`: the same block and results.
11. Zero-rows check: two rows (`test`, `main`), `relationships_should_be_zero` and `activities_should_be_zero` both 0. It counts only the five smoke ids (`...02` to `...06`).

The smoke rows use placeholder values (`smoke-host`, `smoke-entity-type`, `smoke-action`, `smoke-user`) inside rolled-back blocks. Their `document_id` (`...01`) has no `document` row; without foreign keys the tables accept it, and the blocks test only these two tables.

## Order of operations

1. Blocks 1 and 2, then `test` (blocks 3 and 4), then `main` (blocks 5 and 6).
2. Verification (blocks 7 and 8). Every index must be valid before step 3.
3. Smoke tests and the zero-rows check (blocks 9 to 11).
4. Update the Status section below.

Nothing on this branch reads or writes the tables, and TypeORM runs with `synchronize: false`, so registering the entities in `backend/ORM/util/database/Tables.js` does not touch the database. Apply the migration before any code that queries the tables is deployed. Any change under `backend/ORM/` redeploys every Lambda. The entities are not registered in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`; the first Lambda that reads them through that package must add them.

`backend/test/ORM/documentRelationshipActivityEntity.test.js` fails if the entities, `schema.psql`, the migration `.sql` or the migration `.js` drift from each other, including the index names, the smoke rows and the smoke queries.

## Rollback

`20261126_document_relationship_activity_rollback.sql` drops the indexes and then the table, `document_activity` before `document_relationship`, `main` first, then `test`. Run each statement on its own in autocommit, and never as part of the apply. It leaves `document` and `document_version` in place. If `20261124_document` is rolled back too, run this rollback first, so no link or activity outlives its document. Roll back only while the tables hold no real data, or after the data is exported and the code using it is rolled back.

## Status

- `test` schema applied: Not applied (date: -, by: -)
- `main` schema applied: Not applied (date: -, by: -)
