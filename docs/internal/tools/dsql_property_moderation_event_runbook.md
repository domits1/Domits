# Property moderation event table (2026-10-29)

Runbook for the hand-applied migration under `backend/ORM/migrations/` (issue #3302, slice 2, moderation history):

- `20261029_property_moderation_event.{js,sql}` and `20261029_property_moderation_event_rollback.sql`

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` files hold the statements to run and contain no comments, so the run order and the Aurora DSQL rules live here. Connect as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md), as the `admin` database user.

## What the table is for

`property_moderation_event` is the history of a property's review. One row per transition:

- `SUBMITTED`: a host submitted the property for review (`INACTIVE`, `REJECTED` or `ARCHIVED` to `PENDING_REVIEW`).
- `APPROVED`: an admin approved it (`PENDING_REVIEW` to `ACTIVE`).
- `REJECTED`: an admin rejected it (`PENDING_REVIEW` to `REJECTED`). Only this action is expected to carry a `reason`.

`actor_id` is the caller's Cognito `Username`, the same value as `property.hostid` and the ids in `PROPERTY_REVIEW_ADMIN_USER_IDS`. `created_at` is epoch milliseconds. `property_id` has no foreign key, so a row outlives a deleted property. The table is append-only: the schema cannot enforce that, so the writer only inserts.

`action` and the maximum length of `reason` are validated in code, because DSQL has no `CHECK` constraint. `from_status` and `to_status` are `VARCHAR(50)` because `property.status` is free text.

This change adds the table only. No code writes it yet. History starts when the writer ships: there are no baseline or backfill rows for properties that are already `PENDING_REVIEW`, `REJECTED` or `ACTIVE`. There is no retention policy yet.

## Aurora DSQL rules that shape this runbook

- One DDL statement per transaction. Run each statement on its own (autocommit); never wrap a block in `BEGIN`. The only `BEGIN` blocks are the smoke tests, which contain DML only.
- The index is `CREATE INDEX ASYNC`. Check `sys.jobs` until its job reads `completed`. `sys.jobs` forgets finished jobs after about 30 minutes.
- Every DDL commit bumps the catalog version, so warm sessions can fail once with SQLSTATE `40001` / `OC001` and succeed on retry. Run everything in one quiet window, `test` included.
- No foreign keys, no `CHECK` constraints, no column defaults. A column type cannot be altered later.
- The index name carries a `_test` suffix on the `test` schema.

## The index

`property_moderation_event_property_created_idx` on `(property_id, created_at)` serves the one read the feature needs: the history of one property, newest first. It also serves lookups by `property_id` alone. It is not unique, because an event must never be rejected; the primary key on `id` already stops a duplicate insert. There is deliberately no index on `actor_id`.

## Order of operations

1. Pre-flight: the table must not exist in either schema (the `information_schema.tables` query at the top of the file). If it exists, compare its columns with the verification query before going on.
2. `test` schema: the table, then its index, then wait for the index job.
3. Verify `test`: column types and nullability, and the index with `indisunique = f` and `indisvalid = t`. Run the `test` smoke block. Expected: `approved_reason_null_should_be_one` is `1`, `property_events_should_be_two` is `2`.
4. **Stop. Apply `main` only with the mentor's OK**, and before the PR that writes the table is merged. Then repeat steps 2 and 3 for `main`.
5. Run the final query. `smoke_rows_should_be_zero` must be `0` for both schemas.
6. Record the evidence under Status.

## Rollback

`20261029_property_moderation_event_rollback.sql` drops `test` first, then `main`. **Run it on `test` only.** Never run it on `main` once real rows exist: dropping the table loses the moderation history.

## Status

- **test: applied** on 2026-10-30 by Rakib Sheikh, cluster `domits` (eu-west-2), as `admin` in the DSQL query editor.
  - Pre-flight: table absent in `main` and `test`.
  - `CREATE TABLE` succeeded. Index job `sxkbkgrxt5fgpjkmv5lqczlsja` reached `completed` at 2026-10-30 10:01:05 UTC.
  - Columns: 8, types and nullability as in the migration (`reason` the only nullable column, no defaults).
  - Index `property_moderation_event_property_created_idx_test`: `indisunique = f`, `indisvalid = t` (plus the primary key).
  - Smoke block ran; the query editor shows only the last statement's result, so the two counts were not visible. The follow-up check `smoke_rows_should_be_zero` returned `0`.
- **main: not applied.** Needs the mentor's OK, and must be applied before the PR that writes the table is merged.