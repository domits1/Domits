# Automated messages: stay-date triggers migration (#768, part 1)

Runbook for the hand-applied migration under `backend/functions/AutomatedMessaging/migrations/`:

- `002_add_stay_date_triggers.sql`
- `002_add_stay_date_triggers_rollback.sql`

It prepares `main.message_automation` and `main.booking_automation_outbox` for automations that fire relative to the stay (before or after check-in or check-out) and for the event that reports a change of stay dates. Migration `001` was applied to the `main` schema only, so this one is too.

## What it changes

| Object | Change |
|---|---|
| `main.message_automation.offsetdirection` | New nullable `VARCHAR(10)`: `BEFORE` or `AFTER`. `NULL` means `AFTER`, which is how every existing `BOOKING_PAID` automation behaves. |
| `main.message_automation.sendtime` | New nullable `VARCHAR(5)`, `HH:MM`. `NULL` means "the exact offset from the anchor". The format is validated by the service, not by a constraint. |
| `message_automation_triggertype_check` | Widened from `BOOKING_PAID` to `BOOKING_PAID`, `CHECK_IN`, `CHECK_OUT`. |
| `message_automation_offsetdirection_check` | New: `NULL`, `BEFORE` or `AFTER`. |
| `booking_automation_outbox_eventtype_check` | Widened from `BOOKING_PAID` to `BOOKING_PAID`, `BOOKING_DATES_CHANGED`. |

Existing rows are not touched. The migration is backward compatible: the code that is deployed today writes only `BOOKING_PAID`, which every widened constraint still allows, and it ignores the new columns.

## Required before merge and deployment

**Apply this migration before merging the pull request.** `backend/ORM/models/automation/MessageAutomation.js` maps the two new columns, and TypeORM selects every mapped column on every read. Without the columns, every automation read fails with `column "offsetdirection" does not exist` (`42703`). A change under `backend/ORM/` redeploys every Lambda, so merging puts it live everywhere at once. `AutomatedMessaging` also reports `503 SCHEMA_NOT_READY` from its health check and from both scheduled actions until the columns exist, because `schemaGuard` now requires them.

Order of the stay-date work: this migration, then this pull request, then the scheduling and API pull request, then the editor.

No other AWS change is needed: no IAM change, and no change to the two EventBridge schedules, which stay as described in the function README. Applying the SQL below is the only manual step.

## Aurora DSQL rules this migration follows

Source: [ALTER TABLE in Aurora DSQL](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html).

- `ADD COLUMN` takes no `DEFAULT` and no `NOT NULL`, so both columns are nullable. `SET DEFAULT` applies to later inserts only; existing rows keep `NULL`, and the code reads `NULL` as `AFTER`.
- A `CHECK` constraint cannot be changed in place. It is dropped and added again with `NOT VALID`, which applies to new and updated rows at once. `ALTER TABLE ASYNC ... VALIDATE CONSTRAINT` then checks the existing rows as a job you can follow in `sys.jobs`.
- Between the `DROP CONSTRAINT` and the `ADD CONSTRAINT` of one table, writes are not checked. The gap is a few seconds.
- Each statement is its own transaction: DSQL allows one DDL statement per transaction.

## Apply on Aurora DSQL

Connect to the cluster as Admin, as described in [dsql_transitioning_docs.md](./dsql_transitioning_docs.md).

**Run every statement of the `.sql` file as a separate query, in order. Do not submit the file as a multi-statement batch and do not wrap the statements in a transaction.** Wait for each `ASYNC` validation to finish before the next statement.

1. Check the existing `CHECK` constraints. Expect `message_automation_triggertype_check` and `booking_automation_outbox_eventtype_check` among the rows. **Stop and report if a name differs**: the `DROP CONSTRAINT IF EXISTS` statements use these names and would silently drop nothing, leaving the old narrow constraint in place next to the new one. If `information_schema.check_constraints` returns no rows on DSQL, read the names from `pg_constraint` instead.
2. Check that the two columns do not exist yet. Expect no rows.
3. Check `sys.jobs`. Expect no submitted or processing job.
4. Add `offsetdirection`, then add `sendtime`, then set the default `'AFTER'` on `offsetdirection`.
5. Replace the trigger constraint: drop it, add the wider one `NOT VALID`, then run the async validation and wait for it with `sys.jobs` (or `sys.wait_for_job('<job_id>')`).
6. Add the direction constraint `NOT VALID` and validate it the same way.
7. Replace the outbox event type constraint the same way.
8. Run the three verification queries at the end of the file. Expect:
   - no job left in `submitted` or `processing`;
   - two rows for the columns, `character varying`, `is_nullable` `YES`, and the default `'AFTER'::character varying` on `offsetdirection` only;
   - the three widened or new constraints with the clauses from the table above.
9. Open the authenticated `GET /automations/health` after the deployment. It must answer `200 {"ready":true}`.

Check that nothing changed for existing automations: `SELECT COUNT(*) FROM main.message_automation WHERE offsetdirection IS NOT NULL;` returns `0`.

## Rollback

The safest rollback is to revert the pull requests, let them deploy, and leave the columns and the wider constraints in place: they do no harm.

Use `002_add_stay_date_triggers_rollback.sql` only after that revert is deployed. Dropping the columns earlier breaks every automation read, and the first two statements of the file must return `0` and `0`: restoring the narrow constraints fails validation while automations or outbox events of the new types exist. Pause and delete those automations and let their outbox events finish before you continue. A dropped column keeps counting toward the table's lifetime limit of 1,600 columns.

## Status

Not applied yet. When applied, add the date, the schema and the result of step 8 here.
