# Static page outbox: revision column and outbox table (2026-09-30)

Runbook for the hand-applied migration `backend/ORM/migrations/20260930_static_page_outbox.{js,sql}` and its rollback `20260930_static_page_outbox_rollback.sql`.

The `.js` file is the migration record; nothing in this repository executes it. The `.sql` file holds the statements to run, kept free of comments by convention, so the run order and the expected outcomes live here. The rollback lives in its own file, so pasting the migration file from top to bottom can never undo it.

Connect the same way as for [dsql_custom_domain_index_runbook.md](./dsql_custom_domain_index_runbook.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). The DSQL rules from that runbook apply unchanged: one DDL statement per transaction in autocommit, never DDL inside `BEGIN`, and every index activation bumps the catalog version, so warm Lambdas fail one statement with SQLSTATE `40001` / `OC001` and succeed on retry.

## What this migration adds

`main.standalone_site.static_page_revision` (`BIGINT NULL`) counts the publishes of a site. `upsertSiteWithStaticPageOutbox` raises it in SQL with `COALESCE(standalone_site.static_page_revision, 0) + 1`, so the counter is monotonic per site and never comes from an application clock.

`main.static_page_outbox` holds the work for the page worker, **one row per site**: `site_id` is the primary key. A publish upserts that row, so two publishes of the same site can never queue two pieces of work, and the table cannot grow beyond the number of sites. Every status write is conditional on the `revision` it was queued with, so a worker that finishes an old render cannot overwrite a newer publish.

## How the worker moves a row

`PropertyHandler` invoked with `{"task": "build-static-pages"}` takes the rows oldest first, one site at a time. It reads the shell `index.html` from the sites bucket before every page and claims nothing for a page whose shell it cannot read.

- `claimPage` moves a `PENDING` row, or a `FAILED` row older than 10 minutes, to `BUILDING` and adds one to `attempt_count`, guarded by `site_id`, `revision` and the current status, so two workers cannot take the same row. A `BUILDING` row older than 15 minutes counts as abandoned and can be claimed again, so a worker that died mid-render does not strand its page.
- A row with `attempt_count` of 5 is not offered again. It keeps its status and `failure_reason` for the operator, and the next publish resets the counter to 0.
- `ACTIVE`, `FAILED` and `SKIPPED` are written only from `BUILDING` at the claimed revision, and `ACTIVE` additionally only while `standalone_site` still says `PUBLISHED` at that revision, read `FOR UPDATE` so that a concurrent unpublish makes the activation lose as a data conflict (SQLSTATE `40001`, message `OC000`; `OC001` is the schema conflict from the paragraph above) instead of slipping past a plain read. The code treats SQLSTATE `40001` as "not active" and leaves the row `BUILDING` for the next run. Proven on the live cluster on 2026-10-01 with the same construct on `main.standalone_site` inside `BEGIN ... ROLLBACK`: the `EXISTS ... FOR UPDATE` is accepted in a plain `SELECT` and inside an `UPDATE`, and a second session that locked the same row and committed first made the first session's commit fail with `change conflicts with another transaction (OC000)`. `SKIPPED` means the site was deleted or no longer `PUBLISHED` when the worker looked; nothing was uploaded. A `failure_reason` starts with `NO_ACTIVE_DOMAIN`, `INVALID_DOMAIN`, `RENDER_FAILED` or `S3_PUT_FAILED`.
- A publish during a render moves the row to the new revision but leaves it `BUILDING`, so no second worker can start on the new revision while the first still holds the site. The first worker's status write then finds nothing, and on every such exit it sets the newer row back to `PENDING`; the next run renders the newer revision, and one writer per site is kept at all times. Retrying is always safe: one revision renders the same bytes to the same key.

## Why this is safe to run while hosts are publishing

Every statement is additive: one nullable column, one new table, one `CREATE INDEX ASYNC`. There is no `UPDATE` backfill, so no statement touches many rows and none can hit the DSQL limit of 3,000 changed rows per transaction. Existing sites keep their `static_page_revision` as `NULL`; the repository maps `NULL` to `0`, so a site that has never been published through the new code reads as revision 0 and gets revision 1 on its next publish.

The new column is invisible to the current code paths until the deploy that carries the repository change, and the new table has no reader until PR 6. Applying the migration before the deploy is therefore the safe order, and applying it after the deploy makes every publish fail on a missing table, so **apply the migration first**.

## Blocks in the `.sql` file, in order

1. Pre-flight: does `static_page_revision` already exist? Empty on a first run.
2. Pre-flight: does `static_page_outbox` already exist? Empty on a first run.
3. Jobs on the table that are still `submitted` or `processing`. Must be empty before the DDL. Finished jobs stay visible in `sys.jobs` for about 30 minutes and do not block.
4. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS static_page_revision BIGINT NULL`.
5. `CREATE TABLE IF NOT EXISTS main.static_page_outbox`.
6. `CREATE INDEX ASYNC IF NOT EXISTS static_page_outbox_status_updated`. Note the returned `job_id`.
7. Poll `sys.jobs` on the object name until `completed`. A `failed` row leaves the index `INVALID`; drop it and start over.
8. Column verification: ten rows, with `status` defaulting to `'PENDING'` and `attempt_count` to `0`.
9. Catalog verification: the index exists with `indisvalid = t` and `key_columns = status,updated_at`. The primary key on `site_id` appears as a second, unique row.
10. Count of sites without a revision. Informational: on 2026-09-30 every existing site returns here, which is expected and harmless.
11. Smoke test (`BEGIN ... ROLLBACK`): two inserts for `smoke-site`, the second with `ON CONFLICT (site_id) DO UPDATE`. The `SELECT` must show **one** row with `revision = 2`. That is the one-row-per-site rule. `ROLLBACK` leaves nothing behind.
12. Count that must read zero, proving the smoke test left no row.

## Rollback

`20260930_static_page_outbox_rollback.sql` reverses the migration completely: drop the index, drop the table, drop the column, one statement per transaction in autocommit like the DDL above. Dropping the column loses the revision counters, so a later re-apply starts every site at revision 1 again. That is harmless: the worker compares the revision it read with the revision on the row, and both come from the same table, so restarting the count cannot make a stale render look current.

Roll back only when the deploy that uses the column is also rolled back. With the new code live and the column gone, every publish fails.
