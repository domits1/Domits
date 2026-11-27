# Document tables (2026-11-24)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3870, Owner Portal documents, the first part of the shared Document Lifecycle Management service):

- `20261124_document.{js,sql}` and `20261124_document_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run. It opens with a short comment header that repeats the run order, as the property owner migration does.

Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md). Confirm the cluster from SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1, and apply as the `admin` database user the runtime uses (`backend/ORM/index.js`).

This migration creates `document` and `document_version` only. `document_relationship` (links to properties, owners and other entities) and `document_activity` (the activity log) follow in a separate migration with its own runbook, [dsql_document_relationship_activity_runbook.md](./dsql_document_relationship_activity_runbook.md).

## Purpose

- `document`: one row per document, scoped to the host who manages it (`host_id`). Holds the metadata: `title`, `description`, `category`, `status` (default `active`), `visibility` (default `internal`), `review_status`, and the dates the document carries (`issue_date`, `expiration_date`). `current_version_id` points to the current `document_version` row. It is nullable, so the document row can be written before its first version. `archived_at` and `deleted_at` stay NULL until the document is archived or soft-deleted.
- `document_version`: one row per uploaded file of a document. `version_number` counts from 1 per document. `storage_key` is the object key in file storage; the table holds no bucket name or URL. `file_name`, `mime_type`, `file_size` (bytes) and the optional `checksum` describe the file. Versions are immutable: there is no `updated_at`, and a new file is a new row.

Indexes:

- `document_host_id_idx`, `document_host_id_category_idx`, `document_host_id_expiration_date_idx`: a host's documents, by category, and the documents of a host close to their expiration date.
- `document_version_document_id_version_number_unique`: one row per document and version number.
- `document_version_host_id_idx`: a host's versions.

## Prerequisites

- An admin session on the right cluster, confirmed from SSM as above.
- A quiet window. Every DDL commit and index activation bumps the catalog version, and warm Lambdas fail their next statement once with SQLSTATE `40001` / `OC001`. This applies to `test` too.
- Neither table exists yet in either schema (block 1), and no index job on them is in flight (block 2).

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own in autocommit, never inside `BEGIN`. The `BEGIN` blocks in the file contain DML only.
- Indexes are `CREATE [UNIQUE] INDEX ASYNC`. Wait until every job in `sys.jobs` reads `completed` and every index shows `indisvalid = t` before any smoke block runs. Without the unique index, the repeated version 1 would be inserted and `versions_should_be_two` would read 3. `sys.jobs` forgets finished jobs after about 30 minutes.
- **CHECK constraints only for rules that never change.** `document_version` carries two, inline in the `CREATE TABLE`, with the `_test` suffix in `test`:
  - `document_version_version_number_check`: `version_number >= 1`.
  - `document_version_file_size_check`: `file_size > 0`.
- **No CHECK on `category`, `status`, `visibility` or `review_status`.** Those lists may grow; the service layer validates them.
- **No foreign keys**, as for the property owner tables. The service layer keeps `document_version.document_id` pointing to a `document` of the same `host_id`, and `document.current_version_id` pointing to a version of the same document.
- Index and constraint names carry a `_test` suffix on `test`, and every name fits the 63-character PostgreSQL identifier limit.

## Blocks in the file, in order

1. Pre-flight on `information_schema.tables`: expect no row. An existing table would be skipped silently by `CREATE TABLE IF NOT EXISTS`; stop and compare it with blocks 7 to 9.
2. Pre-flight on `sys.jobs`: no `submitted` or `processing` job whose `object_name` contains `document`.
3. `test` schema: `test.document` and its three indexes, then `test.document_version` with its two CHECK constraints and its two indexes, each statement on its own.
4. Re-run the `sys.jobs` query on `test.document%` until all five index jobs read `completed`. A `failed` job leaves its index invalid: drop that index and run its statement again.
5. `main` schema: the same two tables, constraints and five indexes, without the suffix.
6. Re-run the `sys.jobs` query on `main.document%` until all five jobs read `completed`.
7. Columns: 56 rows, 28 per schema (16 for `document`, 12 for `document_version`). Nullable are only `description`, `review_status`, `current_version_id`, `issue_date`, `expiration_date`, `archived_at`, `deleted_at`, `checksum` and `change_description`. `status` defaults to `'active'`, `visibility` to `'internal'`.
8. Indexes: 14 rows, 7 per schema (two primary keys and five indexes), all `indisvalid = t`. `indisunique = t` only on the primary keys and `document_version_document_id_version_number_unique`.
9. CHECK constraints: 4 rows, `CHECK ((version_number >= 1))` and `CHECK ((file_size > 0))` per schema.
10. Smoke test on `test`, one `BEGIN ... ROLLBACK` block. The repeated version 1 (row `...04`, `ON CONFLICT DO NOTHING`) reports `INSERT 0 0`. Then `default_status_should_be_active` = `active`, `default_visibility_should_be_internal` = `internal`, `versions_should_be_two` = 2.
11. Smoke test on `main`: the same block and results.
12. Negative checks, four `BEGIN ... ROLLBACK` blocks: version number 0 and an empty file on `test`, then on `main`. **Each INSERT is expected to fail** with SQLSTATE `23514` naming `document_version_version_number_check[_test]` or `document_version_file_size_check[_test]`. Run the `ROLLBACK` after the error. `INSERT 0 1` means the constraint is missing: roll back, stop, check block 9.
13. Zero-rows check: two rows (`test`, `main`), `documents_should_be_zero` and `versions_should_be_zero` both 0. It counts only the six smoke ids.

The smoke rows use placeholder values (`smoke-host`, `smoke-category`, `smoke-user`) inside rolled-back blocks; they are not the category list the service layer will validate.

## Order of operations

1. Blocks 1 and 2, then `test` (blocks 3 and 4), then `main` (blocks 5 and 6).
2. Verification (blocks 7 to 9). Every index must be valid before step 3.
3. Smoke tests, negative checks and the zero-rows check (blocks 10 to 13).
4. Update the Status section below.

Nothing on this branch reads or writes the tables, and TypeORM runs with `synchronize: false`, so registering the entities in `backend/ORM/util/database/Tables.js` does not touch the database. Apply the migration before any code that queries the tables is deployed. Any change under `backend/ORM/` redeploys every Lambda. The entities are not registered in `backend/functions/.shared/integrations/ORM/util/database/Tables.js`; the first Lambda that reads them through that package must add them.

`backend/test/ORM/documentEntity.test.js` fails if the entities, `schema.psql`, the migration `.sql` or the migration `.js` drift from each other, including the CHECK names and expressions, the smoke queries and the negative blocks.

## Rollback

`20261124_document_rollback.sql` drops the indexes and then the table, `document_version` before `document`, `main` first, then `test`. Run `20261126_document_relationship_activity_rollback.sql` first, because `document_relationship` and `document_activity` point at `document`. Run each statement on its own in autocommit, and never as part of the apply. Roll back only while the tables hold no real data, or after the data is exported and the code using it is rolled back. The rollback does not remove files from storage.

## Status

- `test` schema applied: Not applied (date: -, by: -)
- `main` schema applied: Not applied (date: -, by: -)
