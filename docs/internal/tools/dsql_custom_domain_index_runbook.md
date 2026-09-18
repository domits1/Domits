# One custom domain per site: partial unique index (2026-09-18)

Runbook for the hand-applied migration `backend/ORM/migrations/20260918_standalone_site_domain_custom_site_unique.{js,sql}`.

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the expected outcomes and the two post-index checks live here.

Connect the same way as for [dsql_booking_columns_runbook.md](./dsql_booking_columns_runbook.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). The DSQL rules from that runbook apply unchanged: one DDL statement per transaction in autocommit, never DDL inside `BEGIN`, and every index activation bumps the catalog version so warm Lambdas fail one statement with SQLSTATE `40001` / `OC001` and succeed on retry.

## What the index enforces

`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS standalone_site_domain_custom_site_unique ON main.standalone_site_domain (site_id) WHERE domain_type = 'CUSTOM'` makes the one-custom-domain-per-site rule a database guarantee. Only `main` has the standalone tables; the `test` schema has none, so there is no `test` variant. Partial unique indexes are part of the DSQL `CREATE INDEX ASYNC` grammar (`WHERE predicate`), and the async build follows the same lifecycle as the booking indexes: `job_id` returned at once, `sys.jobs` row until about 30 minutes after completion, `pg_index.indisvalid = t` once enforced.

The service check in `websiteCustomDomainService.js` (`requestCustomDomain`) fires first in every sequential flow. The index only decides the race where two connect requests for one site pass that check together. The losing insert is mapped by `storeCustomDomainClaim`, which matches `error.code = '23505'` and `error.constraint = 'standalone_site_domain_custom_site_unique'` exactly and answers `domain_limit_reached`.

## Blocks in the `.sql` file, in order

1. Pre-flight: sites with more than one `CUSTOM` row. Must return no rows; on 2026-09-18 `main` held 1 `CUSTOM` and 12 `FALLBACK` rows and no duplicates. If rows come back, the build will fail with `Found duplicate key while validating index for UCVs`; resolve the duplicates, drop the failed index, and create it again.
2. In-flight jobs on the table. Must be empty before the DDL.
3. `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ...`. Note the returned `job_id`.
4. Poll `sys.jobs` on the object name until `completed`. A `failed` row keeps the index `INVALID` and still enforcing on writes; drop it and start over.
5. Catalog verification: exactly one row with `indisunique = t`, `indisvalid = t`, and an `index_definition` ending in `WHERE (domain_type = 'CUSTOM')`. Do not continue until `indisvalid` is `t`.
6. Smoke test 1 (`BEGIN ... ROLLBACK`): two `CUSTOM` inserts for `smoke-site`. The second `INSERT` must fail with a duplicate key error on the new index; that failure is the passing result. `ROLLBACK` ends the aborted transaction.
7. Smoke test 2 (`BEGIN ... ROLLBACK`): one `FALLBACK` row and one `CUSTOM` row for the same site. Both must insert, and the `SELECT` must show two rows; the predicate keeps fallback rows out of the rule.
8. Post-index check A, constraint name (see below).
9. Post-index check B, concurrent claims (see below). This block spans two sessions and commits one probe row; the `DELETE` at the end removes it.
10. Rollback: `DROP INDEX IF EXISTS`. Last in the file; do not paste the file top to bottom.

## Post-index check A: the constraint name DSQL reports

The service mapping depends on `error.constraint` being exactly `standalone_site_domain_custom_site_unique`, unqualified. On the existing `domain` index DSQL reported `constraint: "standalone_site_domain_unique"` with `schema: "main"` in separate fields (probed on 2026-09-18 inside a rolled-back transaction), so the same shape is expected here, but it has not been observed on this index yet.

Read it from two places and compare:

- The catalog `SELECT` in block 8 must return `reported_constraint_name = standalone_site_domain_custom_site_unique`.
- The duplicate key error from smoke test 1 must read `duplicate key value violates unique constraint "standalone_site_domain_custom_site_unique"`, with nothing before the name inside the quotes.

If either shows a schema-qualified or otherwise different name, the constant `CUSTOM_DOMAIN_PER_SITE_INDEX` in `websiteCustomDomainService.js` must be changed to the reported value before the service is relied on, or the race keeps answering `internal_error`.

## Post-index check B: does the loser get 23505 or 40001

DSQL uses optimistic concurrency, so two transactions that both insert a `CUSTOM` row for the same site may not fail on the unique index at all; the second commit may instead be refused with a serialization error (SQLSTATE `40001`, DSQL codes `OC000` / `OC001`). The service maps only `23505` to `domain_limit_reached`; a `40001` on the losing claim still reaches the host as `internal_error` 500.

Run block 9 across two psql sessions:

1. Session A: `BEGIN;` then the `race-custom-a` `INSERT`. Do not commit yet.
2. Session B: `BEGIN;` then the `race-custom-b` `INSERT`. It is expected to succeed inside its own transaction.
3. Session A: `COMMIT;` Expected to succeed.
4. Session B: `COMMIT;` This is the observation. Record the SQLSTATE and message verbatim.
5. The `SELECT` must show exactly one `race-site` row. Run the `DELETE` and confirm `race_rows_left = 0`.

Outcomes:

- Session B fails with `23505` on `standalone_site_domain_custom_site_unique`: the service mapping covers the race as built. Nothing to change.
- Session B fails with `40001` (or any `OC` code): the host in that seat gets `internal_error`. Open a follow-up to treat a serialization failure on the claim the same way as the unique violation (reread the site's custom row; if one exists, answer `domain_limit_reached`), or to retry the claim once. Do not merge that change without repeating this check.
- Both commits succeed: the index is not enforcing. Stop, re-run block 5, and do not deploy the service change that relies on it.

## Order of operations for the whole change

1. Blocks 1 to 5. Wait for `indisvalid = t`.
2. Blocks 6 and 7.
3. Checks A and B. Record the observed constraint name and the SQLSTATE from check B in this file under a dated line.
4. Only then merge the service change in `websiteCustomDomainService.js`; before the index exists the mapping is dead code and the sequential check alone protects the rule.
