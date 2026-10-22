# Cancellation policy: legacy Strict to Limited (2026-10-14)

Runbook for the hand-applied migration `backend/ORM/migrations/20261014_cancellation_policy_strict_to_limited.{js,sql}` and its rollback `20261014_cancellation_policy_strict_to_limited_rollback.sql`.

The `.js` file is the migration record; nothing in this repository executes it. The `.sql` file holds the statements to run, kept free of comments by convention, so the run order and the expected outcomes live here. The rollback lives in its own file, so pasting the migration file from top to bottom can never undo it.

Connect using the documented path in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md) (console → Aurora DSQL → cluster → Connect → Open in CloudShell, as Admin, or the Query Editor). Confirm the cluster from the runtime's own configuration first: SSM parameters `/aurora/dsql/host` and `/aurora/dsql/region` in eu-north-1 (`backend/ORM/index.js:82-85`).

## Why it exists

Before #832 the host option labelled "Limited (Cancel up to 14 days before)" was saved as the rule `CancellationPolicy:Strict`, and every booking snapshotted that choice into `booking.cancellation_policy` as `'Strict'`. Guests were shown the 14-day Limited terms.

#832 adds a real 90-day Strict policy and a separate `CancellationPolicy:Limited`. Without this migration, every host who chose Limited is shown, and every guest of theirs is refunded under, the 90-day terms. A guest cancelling 20 days before arrival would get 0% instead of the 100% they booked under.

## When to run it

**Before #832 is merged into `acceptance`.** A push to `acceptance` deploys the backend (`deploy.yml`), so merging is deploying.

From the moment the #832 code is live, a host can choose the new 90-day Strict, and a `CancellationPolicy:Strict` row can no longer be told apart from a legacy Limited choice. Block 1 below guards this: it returns 0 only while no #832 code has written a `CancellationPolicy:Limited` row.

## Aurora DSQL rules that shape this runbook

- A transaction may modify at most 3,000 rows. Every write statement in the file is capped at `LIMIT 1000` and runs on its own in autocommit, so no statement can hit the limit whatever the row counts are. There is no `BEGIN` anywhere in the file.
- Each write statement is safe to run again: it only touches rows still in the old state. Run it repeatedly until it reports `0` rows, then move on.
- No DDL, so no catalog version bump and no `40001` / `OC001` retries for warm Lambdas.
- `property_rule` has the primary key `(property_id, rule)`, so the rule is moved by inserting the `Limited` row and then deleting the `Strict` row, not by updating the key. Between the two statements a property briefly has both rows with the same value; `getCancellationPolicyByPropertyId` reads either one as a valid policy.

## Blocks in the file, in order

1. **Pre-flight.** `limited_rows_already_present` must be `0`. If it is not, stop: the #832 code has already run somewhere against this database, and the legacy rows can no longer be separated from new choices. Escalate instead of running the rest.
2. **Counts.** Note `strict_property_rules`, `strict_bookings_main` and `strict_bookings_test`. Block 7 is checked against them.
3. **Insert the Limited rows.** Repeat until it reports `INSERT 0 0`.
4. **Delete the Strict rows** that now have a Limited row. Repeat until it reports `DELETE 0`. Run blocks 3 and 4 in turn until both report 0.
5. **`main.booking`.** Repeat until it reports `UPDATE 0`.
6. **`test.booking`.** Repeat until it reports `UPDATE 0`. `test` has no `property_rule` table, so there is no `test` variant of blocks 3 and 4.
7. **Verification.** Expect `strict_property_rules_left = 0`, `limited_property_rules` equal to `strict_property_rules` from block 2, and both `strict_bookings_left_*` at `0`.
8. **One active policy per property.** Expect no rows. A row means a property has two active cancellation policies; the guest-facing read then picks one at random. Fix those properties by hand before merging.

## Rollback

`20261014_cancellation_policy_strict_to_limited_rollback.sql` reverses blocks 3 to 6, with the same batching and the same "repeat until 0" rule.

It is only correct **before** #832 is deployed. Afterwards a `Limited` row can be a real Limited choice and a `Strict` row a real 90-day choice, and the rollback would turn every Limited host into a 90-day Strict one. After the deploy, fix individual rows by hand instead.
