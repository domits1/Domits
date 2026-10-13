# Destinations: the destination and property_destination tables (2026-10-07)

Runbook for the hand-applied migration `backend/ORM/migrations/20261007_destination.{js,sql}` and its rollback `20261007_destination_rollback.sql`. The `.js` file is the migration record; nothing in this repository executes it. The `.sql` file holds the statements to run, kept free of comments by convention, so the run order and the expected outcomes live here. The rollback is a separate file, so pasting the migration file top to bottom can never undo it.

Connect the same way as for [dsql_static_page_outbox_runbook.md](./dsql_static_page_outbox_runbook.md): one DDL statement per transaction in autocommit, never DDL inside `BEGIN`; every index activation bumps the catalog version, so a warm Lambda fails one statement with SQLSTATE `40001` / `OC001` and succeeds on retry.

## What this migration adds

`main.destination` holds one row per destination page: `type` is `continent`, `country` or `city`; `parent_id` points at the row above it; `slug` is the last segment of the URL and `path` the whole path (`/destinations/europe/spain/marbella`), unique; `display_name` is what the page shows; `country_code` is the ISO code for country and city rows. Rows are derived from property locations by the code in `backend/functions/PropertyHandler/util/destination/` and `business/service/destinationResolver.js`; nobody writes them by hand.

`main.property_destination` maps one property to the deepest destination its address resolves to, the city, or the country when the city text cannot be turned into a slug, and remembers the `source_country` and `source_city` text it was derived from, so a later address change or a backfill can tell whether a mapping is current. Whether a destination has a page is not stored: it is computed from the mapped properties whose status is `ACTIVE`, with the thresholds of `util/destination/destinationSettings.js`.

Only `main` has the property tables; there is no `test` variant.

## Why this is safe to run while hosts are working

Every statement is additive: two new tables and three async indexes on empty tables.

## Blocks in the `.sql` file, in order

1. Pre-flight: the two tables must not exist yet. Empty on a first run.
2. Jobs on the tables still `submitted` or `processing`. Must be empty before the DDL.
3. `CREATE TABLE IF NOT EXISTS main.destination`.
4. `CREATE TABLE IF NOT EXISTS main.property_destination`.
5. `CREATE UNIQUE INDEX ASYNC ... destination_path_unique`, note the `job_id`.
6. `CREATE INDEX ASYNC ... destination_parent`, note the `job_id`.
7. `CREATE INDEX ASYNC ... property_destination_destination`, note the `job_id`.
8. Poll `sys.jobs` until all three jobs are `completed`. A `failed` job leaves its index `INVALID`: drop that index and run its statement again.
9. Catalog check: five index rows, the two primary keys and the three indexes, all `indisvalid = t`, `destination_path_unique` the only one with `indisunique = t` besides the primary keys.
10. Two counts, both `0` on a first run.

## Rollback

`20261007_destination_rollback.sql` drops the three indexes and the two tables, one statement per transaction. Everything in them is derived, so a later re-apply plus the backfill task rebuilds the same content.
