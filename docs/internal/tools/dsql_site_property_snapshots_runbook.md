# Website property snapshots column (2026-11-17)

Runbook for the hand-applied migration `backend/ORM/migrations/20261117_standalone_site_property_snapshots.{js,sql}` and its rollback `20261117_standalone_site_property_snapshots_rollback.sql`.

The `.js` file is the migration record; nothing in this repository executes it. Connect the same way as for [dsql_static_page_outbox_runbook.md](./dsql_static_page_outbox_runbook.md). Run every statement in autocommit, one at a time, except block 5: run the smoke test `BEGIN; SELECT ... FOR UPDATE; ROLLBACK;` as one explicit transaction. Never put the DDL inside `BEGIN`. A warm Lambda can fail one statement with SQLSTATE `40001` / `OC001` right after the DDL and succeeds on retry.

## What this migration adds

`main.standalone_site.published_site_properties_json` (`TEXT NULL`) holds the snapshots of the other properties of an Elite website, written in the publish transaction next to `published_property_snapshot_json`. It is a JSON array of `{ propertyId, propertySnapshot }`, one entry per property in `siteProperties` other than the main one. The snapshots leave out calendar availability, because availability and prices are read live when a guest searches on dates. They also leave out the street, house number and postal code: only country and city are stored. A publish writes the column only for a host with the `website.multi_property` plan. The render reads it only at the `static_page_revision` of the site row it renders, so it never mixes two publishes.

Only `main` has the standalone tables, so there is no `test` variant.

## Why the order does not matter

The new code never puts the column in the shared site columns. It reads the column only to render a site whose served `siteProperties` hold two or more properties. It writes the column only when a publish carries `siteProperties` for a host with the plan. No live site has that list today.

- Migration first, then deploy: the column stays `NULL` until a host publishes a list.
- Deploy first: every existing site renders and publishes as before. Publishing a list fails until the column exists, and a site with a list shows its main property only.

**Apply the migration first** all the same, so the first host who publishes a list does not see an error.

## Blocks in the `.sql` file, in order

1. Pre-flight: does the column already exist? Empty on a first run.
2. Jobs on the table that are still `submitted` or `processing`. Must be empty before the DDL.
3. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS published_site_properties_json TEXT NULL`. Additive and nullable: it touches no rows.
4. Verification: one row, `text`, `is_nullable = YES`.
5. Smoke test (`BEGIN ... ROLLBACK`): the publish check `SELECT ... WHERE id = $1 AND hostid = $2 AND status = 'ACTIVE' FOR UPDATE` on a made-up id. It must run without an error and return no row. It proves the cluster accepts `FOR UPDATE` next to the `hostid` and `status` filters, and it locks and changes nothing.
6. Count of sites with snapshots. Reads `0` right after the migration.

## Limits

An Aurora DSQL column holds at most 1 MiB and a row at most 2 MiB. Publishing refuses snapshots larger than 768 KiB with a clear message, so the row keeps room for the main snapshot and the overrides.

## Rollback

`20261117_standalone_site_property_snapshots_rollback.sql` drops the column, in autocommit. Aurora DSQL supports `ALTER TABLE ... DROP COLUMN` ([ALTER TABLE](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html), checked 2026-11-17): the column disappears at once, its space is reclaimed as rows are updated, and it keeps counting toward the limit of 1,600 columns over the lifetime of the table. The snapshots are lost; a site with a list then shows its main property only, and publishing a list fails until the column is back. Publishes without a list keep working. Roll back only together with the deploy that uses the column.
