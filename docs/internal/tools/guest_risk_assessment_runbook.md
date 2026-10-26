# guest_risk_assessment migration runbook

Table for the Truvi guest screening results (#3371). One row per provider and booking, with the id `<provider>:<bookingId>` (for example `truvi:<bookingId>`).

## Status

| Schema | Migration | Ran on | Ran by |
| ------ | --------- | ------ | ------ |
| test | `20261012_create_guest_risk_assessment.sql` | not run yet | - |
| main | `20261012_create_guest_risk_assessment.sql` | not run yet | - |

Update this table in the same pull request or right after running the migration.

Checked on 2026-10-19: `information_schema.columns` returned no rows for `guest_risk_assessment`, so the table did not exist yet in the shared database.

## Columns

| Column | Type | Null | Meaning |
| ------ | ---- | ---- | ------- |
| id | VARCHAR(255) | no | `<provider>:<bookingId>` |
| provider | VARCHAR(50) | no | `truvi` |
| bookingid | VARCHAR(255) | no | Domits booking id |
| providerassessmentid | VARCHAR(255) | yes | Truvi verification id |
| status | VARCHAR(30) | no | `PASSED`, `FLAGGED`, `FAILED` or `ERROR` (later Truvi PRs add `CANCELLED` and `CANCEL_REFUSED`) |
| flaggedreason | TEXT | yes | Reason Truvi gave for a flag |
| errormessage | TEXT | yes | Short error message (max 200 characters, no guest data) |
| arrivaldate | BIGINT | yes | Check-in (epoch ms) last sent to Truvi, used to send date changes. Set by the screening run. When Truvi refused a change, it holds the refused date and `errormessage` says why |
| departuredate | BIGINT | yes | Check-out (epoch ms) last sent to Truvi, same rules as `arrivaldate` |
| createdat | BIGINT | no | Epoch ms |
| updatedat | BIGINT | no | Epoch ms |

Index: `guest_risk_assessment_bookingid_idx` (main) and `guest_risk_assessment_bookingid_idx_test` (test) on `bookingid`, created with `CREATE INDEX ASYNC`.

No foreign keys or CHECK constraints, because Aurora DSQL does not support them.

## How to run

The database is the shared Aurora DSQL cluster in **eu-west-2 (London)**. The host is in Parameter Store under `/aurora/dsql/host` (eu-north-1).

1. Open Aurora DSQL in eu-west-2, then Query Editor, and connect to the cluster as admin.
2. Open `backend/ORM/migrations/20261012_create_guest_risk_assessment.sql`.
3. Run it **statement by statement**, in order. The file mixes DDL (`CREATE TABLE`, `CREATE INDEX ASYNC`) with `SELECT` checks and `BEGIN ... ROLLBACK` smoke tests, and DSQL does not allow DDL and DML in one transaction.
   - The first `SELECT` must return no rows for the schema you are about to create.
   - After each `CREATE INDEX ASYNC`, the `sys.jobs` query shows the index job. Wait until it is `completed` before the smoke test.
   - The smoke tests insert a row and roll back. The last `SELECT` must return `0` for both schemas.
4. Fill in the Status table above.

## Rollback

Run `backend/ORM/migrations/20261012_create_guest_risk_assessment_rollback.sql` statement by statement. It drops the indexes and the tables in `main` and `test`. All saved screening results are lost, and the next Truvi run screens the bookings again.
