# guest_risk_assessment migration runbook

Table for the Truvi guest screening results (#3371). One row per provider and booking, with the id `<provider>:<bookingId>` (for example `truvi:<bookingId>`).

## Status

| Schema | Migration | Ran on | Ran by |
| ------ | --------- | ------ | ------ |
| test | `20261012_create_guest_risk_assessment.sql` | not run yet | - |
| main | `20261012_create_guest_risk_assessment.sql` | not run yet | - |
| test | `20261104_guest_risk_assessment_failed_attempts.sql` | not run yet | - |
| main | `20261104_guest_risk_assessment_failed_attempts.sql` | not run yet | - |

Update this table in the same pull request or right after running the migration.

Checked on 2026-10-19: `information_schema.columns` returned no rows for `guest_risk_assessment`, so the table did not exist yet in the shared database.

## Columns

| Column | Type | Null | Meaning |
| ------ | ---- | ---- | ------- |
| id | VARCHAR(255) | no | `<provider>:<bookingId>` |
| provider | VARCHAR(50) | no | `truvi` |
| bookingid | VARCHAR(255) | no | Domits booking id |
| providerassessmentid | VARCHAR(255) | yes | Truvi verification id |
| status | VARCHAR(30) | no | `PASSED`, `FLAGGED`, `FAILED`, `ERROR` or `SKIPPED` (later Truvi PRs add `CANCELLED` and `CANCEL_REFUSED`) |
| flaggedreason | TEXT | yes | Reason Truvi gave for a flag |
| errormessage | TEXT | yes | Short error message (max 200 characters, no guest data) |
| arrivaldate | BIGINT | yes | Check-in (epoch ms) last sent to Truvi, used to send date changes. Set by the screening run. When Truvi refused a change, it holds the refused date and `errormessage` says why |
| departuredate | BIGINT | yes | Check-out (epoch ms) last sent to Truvi, same rules as `arrivaldate` |
| createdat | BIGINT | no | Epoch ms |
| updatedat | BIGINT | no | Epoch ms |
| failedattempts | INTEGER | yes | Unexpected Truvi 400 answers since the last saved result of a modify or cancel run. Other 4xx, 5xx and timeouts do not count. After 3 the run gives up, see "Failed Attempts" in `truvi-screening-schedule.md`. Added by `20261104_guest_risk_assessment_failed_attempts.sql` |

Index: `guest_risk_assessment_bookingid_idx` (main) and `guest_risk_assessment_bookingid_idx_test` (test) on `bookingid`, created with `CREATE INDEX ASYNC`.

No foreign keys or CHECK constraints, because Aurora DSQL does not support them.

## When to run

Run the migration only after #3555 is merged into `acceptance`, and only from the `acceptance` version of the file. The `arrivaldate` and `departuredate` columns were added to this create migration later (commit d8ecd3036), and the date changes run of #3625 needs them. An older copy of the file creates the table without them, and then every save of the screening run and the modify run fails.

Before running, check that the `CREATE TABLE` statements in the file contain `arrivaldate` and `departuredate`. Do not enable the `modify-changed-bookings` schedule before #3625 is merged.

## How to run

The database is the shared Aurora DSQL cluster in **eu-west-2 (London)**. The host is in Parameter Store under `/aurora/dsql/host` (eu-north-1).

1. Open Aurora DSQL in eu-west-2, then Query Editor, and connect to the cluster as admin.
2. Open `backend/ORM/migrations/20261012_create_guest_risk_assessment.sql`.
3. Run it **statement by statement**, in order. The file mixes DDL (`CREATE TABLE`, `CREATE INDEX ASYNC`) with `SELECT` checks and `BEGIN ... ROLLBACK` smoke tests, and DSQL does not allow DDL and DML in one transaction.
   - The first `SELECT` must return no rows for the schema you are about to create.
   - After each `CREATE INDEX ASYNC`, the `sys.jobs` query shows the index job. Wait until it is `completed` before the smoke test.
   - The smoke tests insert a row and roll back. The last `SELECT` must return `0` for both schemas.
4. Fill in the Status table above.

Then run `backend/ORM/migrations/20261104_guest_risk_assessment_failed_attempts.sql` the same way, statement by statement. It adds the nullable `failedattempts` column to `test` and `main`. The entity reads every column, so this has to run in a schema before Truvi code with `failedAttempts` is deployed against it.

- The first `SELECT` shows whether the column already exists. `ADD COLUMN IF NOT EXISTS` makes a second run harmless.
- The smoke test inserts a row with `failedattempts = 2` and rolls back. The last `SELECT` must return `0`.

## Rollback

To remove only the failed attempts column, run `backend/ORM/migrations/20261104_guest_risk_assessment_failed_attempts_rollback.sql`. Deploy Truvi code without `failedAttempts` first, because the entity reads the column.

Run `backend/ORM/migrations/20261012_create_guest_risk_assessment_rollback.sql` statement by statement. It drops the indexes and the tables in `main` and `test`. All saved screening results are lost, and the next Truvi run screens the bookings again.
