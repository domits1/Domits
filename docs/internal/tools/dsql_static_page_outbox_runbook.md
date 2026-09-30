# Static page outbox: revision column and outbox table (2026-09-30)

Runbook for the hand-applied migration `backend/ORM/migrations/20260930_static_page_outbox.{js,sql}`.

The `.js` file is the migration record; nothing in this repository executes it. The `.sql` file holds the statements to run, kept free of comments by convention, so the run order and the expected outcomes live here.

Connect the same way as for [dsql_custom_domain_index_runbook.md](./dsql_custom_domain_index_runbook.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). The DSQL rules from that runbook apply unchanged: one DDL statement per transaction in autocommit, never DDL inside `BEGIN`, and every index activation bumps the catalog version, so warm Lambdas fail one statement with SQLSTATE `40001` / `OC001` and succeed on retry.

## What this migration adds

`main.standalone_site.static_page_revision` (`BIGINT NULL`) counts the publishes of a site. `upsertSiteWithStaticPageOutbox` raises it in SQL with `COALESCE(standalone_site.static_page_revision, 0) + 1`, so the counter is monotonic per site and never comes from an application clock.

`main.static_page_outbox` holds the work for the page worker, **one row per site**: `site_id` is the primary key. A publish upserts that row, so two publishes of the same site can never queue two pieces of work, and the table cannot grow beyond the number of sites. Every status write is conditional on the `revision` it was queued with, so a worker that finishes an old render cannot overwrite a newer publish.

## How the worker moves a row

```
PENDING ──claim──▶ BUILDING ──page uploaded──▶ ACTIVE
FAILED  ──claim──▶ BUILDING ──render or upload failed──▶ FAILED
                   BUILDING ──site gone or not PUBLISHED──▶ SKIPPED
```

- The worker runs when `PropertyHandler` is invoked with `{"task": "build-static-pages"}` and takes the rows oldest first, one site at a time.
- **Claim.** `claimPage` moves a `PENDING` or `FAILED` row to `BUILDING` and adds one to `attempt_count`, guarded by `site_id`, `revision` and the current status, so two workers cannot take the same row. A `BUILDING` row whose `updated_at` is older than 15 minutes counts as abandoned and can be claimed again, so a worker that died mid-render does not strand its page.
- **Limit.** A row with `attempt_count` of 5 is not offered again. It keeps its status and `failure_reason` for the operator, and the next publish resets the counter to 0. Only `attempt_count`, not the status, tells a row that gave up from one that will be retried.
- **Outcome.** `ACTIVE`, `FAILED` and `SKIPPED` are written only from `BUILDING` at the claimed revision. `SKIPPED` means the site was deleted or no longer `PUBLISHED` when the worker looked; nothing was uploaded and the row waits for the next publish. `failure_reason` starts with a code: `NO_ACTIVE_DOMAIN`, `INVALID_DOMAIN`, `RENDER_FAILED`, `S3_PUT_FAILED`.
- **A newer publish during a render.** The publish rewrites the row to the new revision, so the older worker's status write finds nothing and writes nothing. Because its upload may still have landed after the newer one, it then sets a newer row that is `BUILDING` or `ACTIVE` back to `PENDING`, and the next run renders the newer revision again. Retrying is always safe: the same revision renders the same bytes to the same key.
- **The shell.** The worker reads `index.html` from the sites bucket once per run and claims nothing when that read fails.

Only `main` has the standalone tables; the `test` schema has none, so there is no `test` variant.

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
13. Rollback: drop the index, drop the table, drop the column. Last in the file; do not paste the file top to bottom.

## Rollback

Block 13 reverses the migration completely. Dropping the column loses the revision counters, so a later re-apply starts every site at revision 1 again. That is harmless: the worker compares the revision it read with the revision on the row, and both come from the same table, so restarting the count cannot make a stale render look current.

Roll back only when the deploy that uses the column is also rolled back. With the new code live and the column gone, every publish fails.
