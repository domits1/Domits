# One custom domain per site: partial unique index (2026-09-18)

Runbook for the hand-applied migration `backend/ORM/migrations/20260918_standalone_site_domain_custom_site_unique.{js,sql}`.

The `.js` file is the migration record (nothing in this repo executes it). The `.sql` file holds the statements to run, kept free of comments by convention, so the run order, the expected outcomes and the two post-index checks live here.

Connect the same way as for [dsql_booking_columns_runbook.md](./dsql_booking_columns_runbook.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell). The DSQL rules from that runbook apply unchanged: one DDL statement per transaction in autocommit, never DDL inside `BEGIN`, and every index activation bumps the catalog version so warm Lambdas fail one statement with SQLSTATE `40001` / `OC001` and succeed on retry.

## What the index enforces

`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS standalone_site_domain_custom_site_unique ON main.standalone_site_domain (site_id) WHERE domain_type = 'CUSTOM'` makes the one-custom-domain-per-site rule a database guarantee. Only `main` has the standalone tables; the `test` schema has none, so there is no `test` variant. Partial unique indexes are part of the DSQL `CREATE INDEX ASYNC` grammar (`WHERE predicate`), and the async build follows the same lifecycle as the booking indexes: `job_id` returned at once, `sys.jobs` row until about 30 minutes after completion, `pg_index.indisvalid = t` once the build has finished. A build that fails leaves the index `INVALID`, and an `INVALID` unique index still refuses duplicate writes until it is dropped.

The service check in `websiteCustomDomainService.js` (`requestCustomDomain`) fires first in every sequential flow. The index only decides the race where two connect requests for one site pass that check together. The losing statement is mapped by `storeCustomDomainClaim`, which matches `error.code === "23505"` and `error.constraint === "standalone_site_domain_custom_site_unique"` on the error TypeORM throws, and answers `domain_limit_reached`. Both are structured fields the pg driver fills from the error protocol message; neither is derived from the catalog or from the human-readable message text.

## Blocks in the `.sql` file, in order

1. Pre-flight: sites with more than one `CUSTOM` row. Must return no rows; on 2026-09-18 `main` held 1 `CUSTOM` and 12 `FALLBACK` rows and no duplicates. If rows come back, the build will fail with `Found duplicate key while validating index for UCVs`; resolve the duplicates, drop the failed index, and create it again.
2. Jobs on the table that are still `submitted` or `processing`. Must be empty before the DDL. Finished jobs stay visible in `sys.jobs` for about 30 minutes and do not block.
3. `CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ...`. Note the returned `job_id`.
4. Poll `sys.jobs` on the object name until `completed`. A `failed` row leaves the index `INVALID`; drop it and start over.
5. Catalog verification: exactly one row with `indisunique = t`, `indisvalid = t`, `key_columns = site_id`, and a non-null `predicate` that references `domain_type` and the value `CUSTOM`. The predicate is text reconstructed by `pg_get_expr`, so casts, quoting and parentheses may differ from the statement in block 3; do not compare it as a string. The meaning is checked by blocks 6 and 7. Do not continue until `indisvalid` is `t`.
6. Smoke test 1 (`BEGIN ... ROLLBACK`): two plain `CUSTOM` inserts for `smoke-site`. The second `INSERT` must fail with a duplicate key error; that failure is the passing result. `ROLLBACK` ends the aborted transaction. This block shows the index enforces; it says nothing about what the Lambda's client reports (check A does).
7. Smoke test 2 (`BEGIN ... ROLLBACK`): one `FALLBACK` row and one `CUSTOM` row for the same site. Both must insert and the `SELECT` must show two rows; the predicate keeps fallback rows out of the rule.
8. Post-index check B, case 1: the repository upsert twice in autocommit for `race-site`, then a `DELETE` of the probe rows.
9. Post-index check B, case 2: the repository upsert inside two open transactions, two `COMMIT`s, a `SELECT`, the `DELETE`, and a count that must read zero.
10. Rollback: `DROP INDEX IF EXISTS`. Last in the file; do not paste the file top to bottom.

Check A is a Node script, not a `.sql` block, because it has to go through the Lambda's client stack.

## Post-index check A: what the driver reports through the Lambda's client

The mapping reads `error.code` and `error.constraint` from the error that `Database.getInstance()` (the `database` package, TypeORM on the pg driver) throws. That is the only thing that decides whether the race answers `domain_limit_reached` or `internal_error`. The index name in the catalog and the name quoted in the message text are different things: the message can carry the right name while `error.constraint` is empty or shaped differently, and the mapping would then fall through to the 500 path without any sign in the message. So the constant `CUSTOM_DOMAIN_PER_SITE_INDEX` in `websiteCustomDomainService.js` must be compared with `error.constraint` as captured below, and must not be changed on the basis of the catalog query or the message text.

Run from `backend/` with the same credentials the Lambdas use for SSM (`AWS_PROFILE=domits AWS_REGION=eu-north-1 node probe-custom-domain-index.mjs`), after block 5 shows `indisvalid = t`. The script inserts two `CUSTOM` rows for one probe site inside a transaction and rolls it back, so it writes nothing.

```js
import Database from "database";
const client = await Database.getInstance();
const runner = client.createQueryRunner();
await runner.connect();
await runner.startTransaction();
const row = (id, domain) =>
  runner.query(
    `INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
     VALUES ($1, 'probe-site', $2, 'CUSTOM', 'PENDING', FALSE, '{}', 1, 1, 1)`,
    [id, domain]
  );
try {
  await row("probe-custom-1", "www.probe-one.example");
  await row("probe-custom-2", "www.probe-two.example");
  console.log("UNEXPECTED: second insert succeeded, the index is not enforcing");
} catch (error) {
  const driver = error.driverError || error;
  console.log(JSON.stringify({
    thrownName: error.name,
    code: error.code,
    constraint: error.constraint,
    driverCode: driver.code,
    driverConstraint: driver.constraint,
    schema: driver.schema,
    table: driver.table,
    message: driver.message,
  }, null, 2));
} finally {
  await runner.rollbackTransaction();
  await runner.release();
}
const [left] = await client.query(`SELECT COUNT(*)::int AS n FROM main.standalone_site_domain WHERE site_id = 'probe-site'`);
console.log("probe rows left:", left.n);
await client.destroy();
```

Passing result: `code` and `driverCode` are `"23505"`, `constraint` and `driverConstraint` are both exactly `standalone_site_domain_custom_site_unique`, `schema` is `main`, `table` is `standalone_site_domain`, and `probe rows left` is `0`. Record the printed object under a dated line at the end of this file.

If `constraint` on the thrown error differs from the constant, the mapping never fires. Change the constant to the value of `error.constraint` (the outer field, which is what the service reads), not to the catalog name and not to what the message says. If `constraint` is empty on the thrown error but present on `driverError`, the service has to read `driverError.constraint` instead; that is a code change, and it must be reviewed before this index is relied on.

For reference, the same probe against the existing `domain` index on 2026-09-18 printed `code "23505"`, `constraint "standalone_site_domain_unique"` on both the thrown error and the driver error, `schema "main"`, `table "standalone_site_domain"`. That is the shape expected here; it has not yet been observed on this index.

## Post-index check B: what a losing claim gets from the real statement

Production does not run a plain `INSERT` with an explicit `COMMIT`. `ensureDomain` runs `INSERT ... ON CONFLICT (domain) DO UPDATE ...` through `client.query`, one statement in autocommit, and two Lambdas racing means two of those statements overlapping in time. Blocks 8 and 9 use that exact statement text with literal values. They show two interleavings, not every schedule DSQL can produce, so the result is an observed case for those two shapes and nothing more.

Case 1, insert-time failure (block 8, one session, autocommit):

1. Run the first upsert (`race-custom-a`). It commits a probe row for `race-site`.
2. Run the second upsert (`race-custom-b`), a different domain for the same site. This is the observation. Record the SQLSTATE and message verbatim.
3. Run the `DELETE` for `race-site`.

Case 2, commit-time failure (block 9, two psql sessions):

1. Session A: `BEGIN;` then the `race-custom-c` upsert. Do not commit yet.
2. Session B: `BEGIN;` then the `race-custom-d` upsert. It is expected to succeed inside its own transaction.
3. Session A: `COMMIT;` Expected to succeed.
4. Session B: `COMMIT;` This is the observation. Record the SQLSTATE and message verbatim.
5. The `SELECT` must show exactly one `race-site` row. Run the `DELETE` and confirm `race_rows_left = 0`.

Reading the outcomes:

- Case 1 failing with `23505` on `standalone_site_domain_custom_site_unique` is what the mapping is written for; with check A passing, that interleaving answers `domain_limit_reached`.
- Case 2 failing with `40001` (or any `OC` code) means a claim that loses at commit time reaches the host as `internal_error` 500, because the service maps only `23505`. Open a follow-up to treat a serialization failure on the claim the same way (reread the site's custom row; if one exists, answer `domain_limit_reached`), or to retry the claim once. Do not merge that change without repeating this check.
- Case 2 failing with `23505` means DSQL surfaced the unique violation at commit for this interleaving; that does not rule out `40001` for other schedules, so keep the observation labelled as one case.
- Both commits succeeding in case 2, or the second upsert succeeding in case 1, means the index is not enforcing. Stop, re-run block 5, and do not rely on the service mapping.

## Order of operations for the whole change

1. Blocks 1 to 5. Wait for `indisvalid = t`.
2. Blocks 6 and 7.
3. Check A, then blocks 8 and 9. Record the check A object and both SQLSTATEs from check B under a dated line at the end of this file.
4. Merge the service change in `websiteCustomDomainService.js`. Deploying it before the index exists changes nothing for ordinary requests, because the sequential check still refuses a second domain before any write; it only leaves index violations, which cannot happen without the index, on the old 500 path until the index is there. Deploying it after the index but before check A is done risks the constant not matching what the driver reports, which is the same 500 path with the index in place.
