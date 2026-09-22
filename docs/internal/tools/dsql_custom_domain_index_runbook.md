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
5. Catalog verification: exactly one row with `indisunique = t`, `indisvalid = t`, `key_columns = site_id`, and a non-null `predicate`. The predicate is text reconstructed by `pg_get_expr`, so casts, quoting and parentheses may differ from the statement in block 3; do not compare it as a string. Read it and confirm its meaning: the only condition is `domain_type = 'CUSTOM'`, with no condition on `status` or any other column, so the rule covers a custom row in every status (`PENDING`, `VERIFIED`, `ACTIVE`, `FAILED`, `DISABLED`, `REMOVING`). Blocks 6 and 7 only sample the predicate with `PENDING` rows; a wrong predicate such as `domain_type = 'CUSTOM' AND status = 'PENDING'` would pass both of them and still let a site hold a second custom domain once the first is `ACTIVE`. Do not continue until `indisvalid` is `t` and the predicate has been read.
6. Smoke test 1 (`BEGIN ... ROLLBACK`): two plain `CUSTOM` inserts for `smoke-site`. The second `INSERT` must fail with a duplicate key error; that failure is the passing result. `ROLLBACK` ends the aborted transaction. This block shows the index enforces for that one shape; it says nothing about what the Lambda's client reports (check A does) and nothing about statuses other than `PENDING` (block 5 does).
7. Smoke test 2 (`BEGIN ... ROLLBACK`): one `FALLBACK` row and one `CUSTOM` row for the same site. Both must insert and the `SELECT` must show two rows; the predicate keeps fallback rows out of the rule.
8. Post-index check B, case 1: the repository upsert twice in autocommit for `race-site`, then a `DELETE` of the probe rows.
9. Post-index check B, case 2: the repository upsert inside two open transactions, two `COMMIT`s, a `SELECT`, the `DELETE`, and a count that must read zero.
10. Rollback: `DROP INDEX IF EXISTS`. Last in the file; do not paste the file top to bottom.

Check A is a Node script, not a `.sql` block, because it has to go through the Lambda's client stack.

## Post-index check A: what the driver reports through the Lambda's client

The mapping reads `error.code` and `error.constraint` from the error that `Database.getInstance()` (the `database` package, TypeORM on the pg driver) throws. That is the only thing that decides whether the race answers `domain_limit_reached` or `internal_error`. The index name in the catalog and the name quoted in the message text are different things: the message can carry the right name while `error.constraint` is empty or shaped differently, and the mapping would then fall through to the 500 path without any sign in the message. So the constant `CUSTOM_DOMAIN_PER_SITE_INDEX` in `websiteCustomDomainService.js` must be compared with `error.constraint` as captured below, and must not be changed on the basis of the catalog query or the message text.

The script below is not a file in the repository. Save it as `backend/probe-custom-domain-index.mjs` (it imports the `database` package, so it must sit inside `backend/`), run it from `backend/` with the same credentials the Lambdas use for SSM (`AWS_PROFILE=domits AWS_REGION=eu-north-1 node probe-custom-domain-index.mjs`) after block 5 shows `indisvalid = t`, and delete the file afterwards; do not commit it. The script inserts two `CUSTOM` rows for one probe site inside a transaction and rolls it back, so a clean run writes nothing.

```js
import Database from "database";

const PROBE_SITE = "probe-site";
const client = await Database.getInstance();
const runner = client.createQueryRunner();
let outcome = "no statement ran";
let probeRowsLeft = "not checked";

const row = (id, domain) =>
  runner.query(
    `INSERT INTO main.standalone_site_domain (id, site_id, domain, domain_type, status, is_primary, verification_details_json, last_checked_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'CUSTOM', 'PENDING', FALSE, '{}', 1, 1, 1)`,
    [id, PROBE_SITE, domain]
  );

try {
  await runner.connect();
  await runner.startTransaction();
  try {
    await row("probe-custom-1", "www.probe-one.example");
    await row("probe-custom-2", "www.probe-two.example");
    outcome = "UNEXPECTED: second insert succeeded, the index is not enforcing";
  } catch (error) {
    const driver = error.driverError || error;
    outcome = JSON.stringify(
      {
        thrownName: error.name,
        code: error.code,
        constraint: error.constraint,
        driverCode: driver.code,
        driverConstraint: driver.constraint,
        schema: driver.schema,
        table: driver.table,
        message: driver.message,
      },
      null,
      2
    );
  } finally {
    try {
      await runner.rollbackTransaction();
    } catch (rollbackError) {
      console.error("rollback failed, check the probe rows by hand:", rollbackError.message);
    }
  }
} finally {
  try {
    await runner.release();
  } catch (releaseError) {
    console.error("release failed:", releaseError.message);
  }
  try {
    const [left] = await client.query(
      `SELECT COUNT(*)::int AS n FROM main.standalone_site_domain WHERE site_id = $1`,
      [PROBE_SITE]
    );
    probeRowsLeft = left.n;
  } catch (countError) {
    console.error("count check failed, verify the probe rows by hand:", countError.message);
  }
  await client.destroy();
}

console.log(outcome);
console.log("probe rows left:", probeRowsLeft);
```

The rollback, the release, the count and the pool shutdown each run whether or not the step before them threw, so the script always exits and always prints what it left behind. If `probe rows left` is anything other than `0`, or reads `not checked`, run `DELETE FROM main.standalone_site_domain WHERE site_id = 'probe-site';` by hand and confirm the count before continuing.

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
2. Session B: `BEGIN;` then the `race-custom-d` upsert. It is expected to succeed inside its own transaction, but do not assume the commit is the first thing that can fail: if this statement itself errors, record that SQLSTATE and message verbatim as the case 2 observation, run `ROLLBACK;` in session B, and continue with step 3 so the cleanup still runs.
3. Session A: `COMMIT;` Expected to succeed.
4. Session B: `COMMIT;` (only if step 2 succeeded). This is the observation. Record the SQLSTATE and message verbatim.
5. The `SELECT` must show exactly one `race-site` row. Run the `DELETE` and confirm `race_rows_left = 0`.

Reading the outcomes:

- Case 1 failing with `23505` on `standalone_site_domain_custom_site_unique` is what the mapping is written for; with check A passing, that interleaving answers `domain_limit_reached`.
- Case 2 failing at step 2, before any commit, is the same observation one step earlier: read the SQLSTATE the same way as below.
- Case 2 failing with `40001` (or any `OC` code) means a claim that loses at commit time reaches the host as `internal_error` 500, because the service maps only `23505`. Open a follow-up to treat a serialization failure on the claim the same way (reread the site's custom row; if one exists, answer `domain_limit_reached`), or to retry the claim once. Do not merge that change without repeating this check.
- Case 2 failing with `23505` means DSQL surfaced the unique violation at commit for this interleaving; that does not rule out `40001` for other schedules, so keep the observation labelled as one case.
- Both commits succeeding in case 2, or the second upsert succeeding in case 1, means the index is not enforcing. Stop, re-run block 5, and do not rely on the service mapping.

## Order of operations for the whole change

What the two orders mean:

- Service first, index later: from the moment the index enforces, which includes the `INVALID` state of a build in progress or a failed build, a matching violation already goes through the new handler and answers `domain_limit_reached`. Ordinary requests are unchanged either way, because the sequential check refuses a second domain before any write.
- Index first, service later: every violation between index activation and the service deploy goes through the old handler and answers `internal_error` 500. That window is created by this order and by nothing else.
- In either order, deploying a handler whose constant has not been verified against check A risks a silent mismatch: the violation is still caught, `error.constraint` does not equal the constant, and the request answers 500 exactly as if the mapping did not exist. Check A needs the index to exist, so the constant cannot be verified before the index is there.

Given that, the order used here is:

1. Blocks 1 to 5. Wait for `indisvalid = t` and read the predicate.
2. Blocks 6 and 7.
3. Check A, then blocks 8 and 9. Record the check A object and both SQLSTATEs from check B under a dated line at the end of this file.
4. Deploy the service change in `websiteCustomDomainService.js` immediately after check A passes. The old-handler window is the time between step 1 and this deploy; keep it short, and if a violation is seen in the logs during it, it is the known 500 path, not a new defect.

If the service change is already deployed before the index is created, skip nothing: check A still has to pass, and a failing check A means the deployed constant is wrong and the mapping is not working even though it is live.

## Recorded results

### Check A, 2026-09-22: passed

Index state confirmed first on `main.standalone_site_domain_custom_site_unique`: `indisvalid` true, `indisunique` true, key column `site_id`, predicate `((domain_type)::text = 'CUSTOM'::text)`.

The probe script above, run from `backend/` against `main` through `Database.getInstance()` with the `domits` profile, printed:

```json
{
  "thrownName": "QueryFailedError",
  "code": "23505",
  "constraint": "standalone_site_domain_custom_site_unique",
  "driverCode": "23505",
  "driverConstraint": "standalone_site_domain_custom_site_unique",
  "schema": "main",
  "table": "standalone_site_domain",
  "message": "duplicate key value violates unique constraint \"standalone_site_domain_custom_site_unique\""
}
```

followed by `probe rows left: 0`.

Every passing condition is met. `error.constraint` on the thrown error equals `CUSTOM_DOMAIN_PER_SITE_INDEX` in `websiteCustomDomainService.js` character for character, so `isUniqueViolationOn` matches and a losing claim answers `domain_limit_reached` rather than `internal_error`. The name is present on the outer thrown error, not only on `driverError`, so the service reads the right field and the constant needs no change.

### Check B, blocks 8 and 9: not run yet

Still outstanding. Until it is run, it is unknown whether a claim that loses at commit time surfaces as `23505` on this index or as a `40001` serialization error; the service maps only `23505`, so a `40001` would still reach the host as `internal_error` 500.
