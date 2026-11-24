# Document tables (2026-11-24)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3870, Owner Portal documents, the first part of the shared Document Lifecycle Management service):

- `20261124_document.{js,sql}` and `20261124_document_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run. It opens with a short comment header that repeats the run order, as the property owner migration does. The full run order, the Aurora DSQL rules and the expected results live here.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, as Admin, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1. The runtime connects as the `admin` database user (`backend/ORM/index.js`), so the session you apply this from needs the same role.

## Purpose

The four tables are generic. They hold documents for any part of Domits. The Owner Portal is the first consumer.

- `document`: one row per document, scoped to the host who manages it (`host_id`). Holds the metadata: `title`, `description`, `category`, `status` (default `active`), `visibility` (default `internal`), `review_status`, and the dates the document itself carries (`issue_date`, `expiration_date`). `current_version_id` points to the `document_version` row that is current. It is nullable, so the document row can be written before its first version. `archived_at` and `deleted_at` stay NULL until the document is archived or soft-deleted.
- `document_version`: one row per uploaded file of a document. `version_number` counts from 1 per document. `storage_key` is the object key in file storage. The table holds no bucket name or URL, so storage configuration stays out of the database. `file_name`, `mime_type`, `file_size` (bytes) and the optional `checksum` describe the file. Versions are immutable records: there is no `updated_at`. A new file is a new row.
- `document_relationship`: links a document to the entities it belongs to, as `entity_type` plus `entity_id`, for example a property or an owner. A document can be linked to several entities. The allowed entity types live in the service layer.
- `document_activity`: an append-only log of what happened to a document, `actor_id` doing `action`, with optional `details`. It has no `updated_at`.

The two unique indexes enforce the version and link model:

- `document_version_document_id_version_number_unique`: one row per document and version number.
- `document_relationship_document_entity_unique`: one link per document and entity.

The other indexes serve the expected reads:

- `document_host_id_idx`, `document_host_id_category_idx`, `document_host_id_expiration_date_idx`: a host's documents, filtered by category, and the documents that are close to their expiration date.
- `document_version_host_id_idx`: a host's versions.
- `document_relationship_host_id_entity_idx`: the documents linked to one entity of a host.
- `document_activity_document_id_created_at_idx`: the activity of one document in time order.
- `document_activity_host_id_idx`: a host's activity.

## Prerequisites

- An admin session on the right cluster, confirmed from SSM as above.
- A quiet window. Every DDL commit and index activation bumps the catalog version, and warm Lambdas fail their next statement once with SQLSTATE `40001` / `OC001`. This applies to `test` too.
- No table of the four exists yet in either schema (block 1 checks this).
- No index job on these tables is in flight (block 2 checks this).

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own in autocommit. Never wrap DDL in `BEGIN`. The only `BEGIN` blocks in the file are the smoke tests and the negative checks, and they contain DML only.
- Indexes are `CREATE [UNIQUE] INDEX ASYNC`. The statement returns at once and the build runs in the background. Wait until every job in `sys.jobs` reads `completed` and every index shows `indisvalid = t` before any smoke block runs. Without the unique indexes, the target-less `ON CONFLICT DO NOTHING` inserts would succeed, and `versions_should_be_two` and `relationships_should_be_two` would read 3. `sys.jobs` forgets finished jobs after about 30 minutes.
- **CHECK constraints only for rules that never change.** A constraint cannot be altered later. `document_version` carries two, written inline in the `CREATE TABLE`:
  - `document_version_version_number_check`: `version_number >= 1`. Versions count from 1.
  - `document_version_file_size_check`: `file_size > 0`. An empty file is never a version.
  - In `test` both names carry the `_test` suffix, as for `property_owner_property`.
- **No CHECK on `category`, `status`, `visibility`, `review_status`, `entity_type` or `action`.** Those lists may grow, and a constraint could not be changed to match. The service layer validates them.
- **No foreign keys.** This follows the property owner tables: a foreign key to a shared table would change delete behaviour for other teams. Integrity between the four tables lives in the service layer. That includes:
  - `document_version.document_id`, `document_relationship.document_id` and `document_activity.document_id` point to an existing `document` of the same `host_id`.
  - `document.current_version_id` points to a `document_version` of the same document.
  - `document_relationship.entity_id` points to an existing entity of the given type that belongs to the same host.
- **`host_id` is repeated on every table**, so each table can be scoped to a host without a join.
- Index and constraint names carry a `_test` suffix on the `test` schema, so a `sys.jobs` filter or a catalog read cannot confuse the two. Every name, with its suffix, fits in the 63-character PostgreSQL identifier limit.

## Blocks in the file, in order

Run the file statement by statement, top to bottom: the `test` schema first, then `main`.

1. Pre-flight on `information_schema.tables`: expect no row. If a table already exists, `CREATE TABLE IF NOT EXISTS` skips it silently, so it would keep a shape without the CHECK constraints. Stop and compare it with blocks 7 to 9. Only an empty, mismatching table may be dropped and recreated, with the owners' sign-off.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job whose `object_name` contains `document`.
3. `test` schema: `CREATE TABLE test.document` and its three indexes, `CREATE TABLE test.document_version` with its two CHECK constraints and its two indexes, `CREATE TABLE test.document_relationship` and its two indexes, `CREATE TABLE test.document_activity` and its two indexes. Each statement on its own. Note each `job_id`.
4. Re-run the `sys.jobs` query filtered on `test.document%` until all nine index jobs read `completed`. A `failed` job leaves its index invalid: drop that index and run its statement again.
5. `main` schema: the same four tables, constraints and nine indexes, without the suffix.
6. Re-run the `sys.jobs` query filtered on `main.document%` until all nine jobs read `completed`.
7. Columns: 84 rows, 42 per schema: 16 for `document`, 12 for `document_version`, 7 for `document_relationship` and 7 for `document_activity`. Only these columns are nullable:
   - `document`: `description`, `review_status`, `current_version_id`, `issue_date`, `expiration_date`, `archived_at`, `deleted_at`
   - `document_version`: `checksum`, `change_description`
   - `document_activity`: `details`

   `document.status` has the default `'active'` and `document.visibility` the default `'internal'`. `document_version` has no `updated_at`.
8. Indexes: 26 rows, 13 per schema: the four primary keys plus the nine indexes. Every row must show `indisvalid = t` before you go on. `indisunique = t` only on the primary keys, `document_version_document_id_version_number_unique` and `document_relationship_document_entity_unique`. No index has a predicate.
9. CHECK constraints: 4 rows, two per schema:
   - `document_version_version_number_check[_test]`: `CHECK ((version_number >= 1))`
   - `document_version_file_size_check[_test]`: `CHECK ((file_size > 0))`
10. Smoke test on `test`, one `BEGIN ... ROLLBACK` block. Expected results:
    - The two inserts with `ON CONFLICT DO NOTHING` (rows `...04` and `...06`) report `INSERT 0 0`. Row `...04` repeats version 1 of the smoke document (the version unique index). Row `...06` repeats the link of row `...05` (the link unique index).
    - `default_status_should_be_active` = `active`
    - `default_visibility_should_be_internal` = `internal`
    - `versions_should_be_two` = 2: versions 1 and 2.
    - `relationships_should_be_two` = 2: two links to different entities.
    - `activities_should_be_two` = 2: two activity rows for the same document.
11. Smoke test on `main`: the same block and the same results.
12. Negative checks, four `BEGIN ... ROLLBACK` blocks: version number 0 on `test`, empty file on `test`, then the same two on `main`. **Each INSERT is expected to fail** with SQLSTATE `23514`, for example `new row for relation "document_version" violates check constraint "document_version_version_number_check_test"`. The empty-file block names `document_version_file_size_check[_test]`. Run the block's `ROLLBACK` after the error. If an INSERT reports `INSERT 0 1` instead, the constraint is missing: run the `ROLLBACK`, stop, and check block 9.
13. Zero-rows check: two rows (`test`, `main`), with `documents_should_be_zero`, `versions_should_be_zero`, `relationships_should_be_zero` and `activities_should_be_zero` all 0. It counts only the smoke ids, so it keeps working once real rows exist.

Run each smoke block and each negative block as a whole, from `BEGIN` to its `ROLLBACK`. That way no smoke row is committed, even when a statement inside it fails.

The smoke rows use placeholder values (`smoke-host`, `smoke-category`, `smoke-entity-type`, `smoke-action`). They are not the category, entity type or action lists the service layer will validate.

## Order of operations

1. Blocks 1 and 2, then `test` (blocks 3 and 4), then `main` (blocks 5 and 6).
2. Verification (blocks 7 to 9). Every index must be valid before step 3.
3. Smoke tests (blocks 10 and 11), negative checks (block 12), and the zero-rows check (block 13).
4. Update the Status section below.

Nothing on this branch reads or writes the tables. TypeORM runs with `synchronize: false` (`backend/ORM/index.js`), so registering the entities in `backend/ORM/util/database/Tables.js` does not touch the database. Apply the migration before any code that queries the tables is deployed. Any change under `backend/ORM/` redeploys every Lambda. The entities are not registered in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`; the first Lambda that reads them through that package must add them there.

`backend/test/ORM/documentEntity.test.js` fails if the entities, `schema.psql`, the migration `.sql` or the migration `.js` drift from each other. That includes the CHECK names and expressions, the smoke query conditions and the negative blocks.

## Rollback

`20261124_document_rollback.sql` drops the indexes and then the table, one table at a time: `main` first, then `test`. Run each statement on its own in autocommit. The CHECK constraints go with their table. Do not run the rollback as part of the apply.

Only roll back while the tables hold no real data, or after the document data has been exported and the code that uses it has been rolled back. Dropping the tables loses the document metadata, the version history and the activity log. The files in storage are not removed by the rollback.

## Status

- `test` schema applied: Not applied (date: -, by: -)
- `main` schema applied: Not applied (date: -, by: -)
