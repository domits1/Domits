# Property task checklist item table (2026-10-05)

Runbook for the hand-applied migration under `backend/ORM/migrations/`:

- `20261005_property_task_checklist_item.{js,sql}`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the Aurora DSQL rules and the findings live here instead.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`).

## What the table is for

One row per checklist item on a property task (e.g. "Strip beds", "Replace towels"), read and written by the property-tasks Lambda's `?action=checklist` routes. `taskService.updateTask` also reads this table whenever a task's status changes to `Completed`, to block completion while a required item is still unchecked - so this table has to exist before that code path can be exercised at all, not just before the checklist UI is used.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction, never DDL and DML in the same transaction. Run each statement on its own in psql autocommit mode (or one query at a time in the Query Editor); never wrap a block in `BEGIN`. The only `BEGIN` in the file is the smoke test, which contains DML only.
- The index is created with `CREATE INDEX ASYNC`. The statement returns immediately and the build runs in the background, so check `sys.jobs` until the job reads `completed`. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit and every index activation bumps the cluster-wide catalog version. Sessions holding a stale catalog, including warm Lambdas, fail their next statement once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window, back to back.
- The table is new and empty, so there is no backfill and the 3,000-row transaction limit does not come into play.
- No `CHECK` constraints on any column. Values (e.g. `title` non-empty, `owner_team_member_id` UUID shape) are enforced in code (`checklistItemValidator.js`, `taskChecklistService.js`), and a column constraint cannot be altered later without recreating the table.
- No foreign key to `property_task`, matching this codebase's convention of no TypeORM relations - ownership is checked in the service layer via a join on `task_id`, not a DB constraint.

## Blocks in the file, in order

1. Pre-flight `SELECT` on `information_schema.tables`: expect no row, meaning the table does not exist yet.
2. Pre-flight on `sys.jobs`: no row for `main.%property_task_checklist_item%` with status `submitted` or `processing`. An in-flight job means someone else is applying this right now.
3. `CREATE TABLE IF NOT EXISTS main.property_task_checklist_item`.
4. `CREATE INDEX ASYNC IF NOT EXISTS property_task_checklist_item_task_idx` on `task_id`. `IF NOT EXISTS` makes the file re-runnable after an interrupted session.
5. Wait for the index job: re-run the `sys.jobs` query filtered on `main.property_task_checklist_item%` until it reads `completed`.
6. Verification: 13 columns with the expected types and nullability; the index present with `indisvalid = t` and `task_id` as its key column, read through `pg_namespace` so a later `test` copy cannot be confused with the `main` one.
7. Smoke test: one `BEGIN ... INSERT ... SELECT ... ROLLBACK` block. The row must come back from the `SELECT` and leave nothing behind, which the `count(*)` after it confirms as zero.
8. Rollback: `DROP INDEX`, then `DROP TABLE`, both schema-qualified with `main.` so they cannot silently miss when `search_path` does not include it. Last in the file; do not paste the file top to bottom.

## Order of operations

1. Apply to `main` in a quiet window. Warm Lambdas may fail one statement with `40001` right after; that is expected and resolves on retry.
2. Apply to `test` as well before merging - the reviewer on PR #3438 asked for both, since `updateTask`'s completion gate (`taskService.js:123-124`) reads this table unconditionally once a task is marked `Completed`, so every host's task-completion path 500s until the table exists in whichever environment they're hitting.
3. The migration must be applied **before** this PR's code deploys. A missing table fails every `Completed` status transition, not just checklist-specific calls.

## Status

Not applied yet. Update this section with the date and the person who applied it, as `dsql_booking_columns_runbook.md` does.
