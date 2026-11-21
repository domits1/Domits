# Stay-date triggers, part 1: migration, model and schedule calculator: engineering review

Branch: `feat/768-stay-date-triggers` (from `origin/acceptance`)
Reviewed: the staged diff for PR 1 (migration `002` and its rollback, the `MessageAutomation` model, `schemaGuard`, the runbook, `scheduleCalculator.js`, their tests, this record)
Goal: hosts can send automated messages relative to the stay: before or after check-in, on check-in day at a set time, before or after check-out. This PR prepares the database and adds the pure date calculation. Nothing calls the calculator yet.

## Decision

```
message_automation
  triggertype    BOOKING_PAID | CHECK_IN | CHECK_OUT      (the anchor)
  offsetdirection NULL | BEFORE | AFTER                    (NULL = AFTER, as today)
  sendtime       NULL | 'HH:MM'                            (NULL = exact offset)
booking_automation_outbox
  eventtype      BOOKING_PAID | BOOKING_DATES_CHANGED      (the event itself comes in PR 2)

booking dates + property times ──▶ calculateStayScheduledFor ──▶ { scheduledFor, isPast }
                                   (pure, Europe/Amsterdam)        wired into scheduling in PR 2
```

Decided with the author:
- **Three PRs.** PR 1 is this one. PR 2 wires the calculator into scheduling, the worker safety checks and the API, and makes `updateBookingDates` write `BOOKING_DATES_CHANGED`. PR 3 is the editor. The calculator moved into PR 1 to keep it above the minimum size, with no wiring.
- **Smallest data model.** New trigger types plus an offset direction and a send time, instead of a redesign. Existing rows are not touched and keep working: `NULL` direction means `AFTER`.
- **Migration.** Hand-applied, one statement at a time, with a rollback file and a runbook. It follows the Aurora DSQL rules: columns without `DEFAULT` or `NOT NULL`, `CHECK` constraints dropped and added again `NOT VALID`, then validated asynchronously. There is no `CHECK` on `sendtime`; the service validates it in PR 2. The outbox constraint is widened here so PR 2 does not need a second migration.
- **Time zone.** `Europe/Amsterdam` for every property in v1, because no property has a time zone. The stay date is the UTC calendar date of the booking date, as the existing date variables already read it.
- **Calculator rules.**
  - `CHECK_IN` uses the property's `checkinfrom` and `CHECK_OUT` uses `checkouttill`. Missing or unreadable times fall back to 15:00 and 11:00.
  - Offsets in days keep the local time of day. Offsets in hours and minutes count elapsed time.
  - A send time replaces the time of day and needs an offset in days or no offset.
  - A time inside the skipped spring hour moves forward. A time that happens twice in autumn uses its first occurrence.
  - The result is `{ scheduledFor, isPast }`. A past time is reported, and PR 2 turns it into a `CANCELLED` delivery with a clear reason, never a late send.
- Options weighed for the migration: rebuild the table (rejected, DSQL cannot change a column type and the data is live), a second table for stay rules (rejected, a second place to keep in step), widen the existing table (chosen).
- Consequence accepted: the model maps two columns that must exist before this PR is deployed. The runbook says to apply the migration first.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `001_create_automated_messaging_v1.sql:6` and `:53`: the two `CHECK` constraints have no name. The migration assumes `message_automation_triggertype_check` and `booking_automation_outbox_eventtype_check`. If a real name differs, `DROP CONSTRAINT IF EXISTS` drops nothing and the narrow constraint stays. | 7/10 | Accepted. Runbook step 1 reads the names first and says to stop if they differ. |
| `[P2]` `MessageAutomation.js` (`offsetDirection`, `sendTime`): the entity maps the new columns, so a deployment before the migration makes every automation read fail. | 9/10 | Accepted. The runbook requires the migration before merge, and `schemaGuard` answers 503 until the columns exist. |
| `[P3]` `scheduleCalculator.js` (`calculateStayScheduledFor`): it throws on a rule it cannot honour, such as a send time with an offset in hours. In PR 2 one bad automation must not fail the whole outbox event. | 8/10 | Accepted. PR 2 validates on save and catches per automation. |
| `[P3]` `scheduleCalculator.js` (`readStayDate`): a booking date that is not UTC midnight, for example `2026-06-20T23:00:00Z`, is read as 20 June although it is 21 June in Amsterdam. | 7/10 | Accepted. It matches the date variables. Date-only bookings are UTC midnight. |
| `[P3]` The calculator relies on the runtime's time zone data (`Intl`, `nodejs22.x`). | 7/10 | Accepted. The DST tests run on the same runtime. |
| `[P3]` The migration's catalog query uses `information_schema.check_constraints`, which is unverified on DSQL. | 6/10 | Accepted. The runbook gives `pg_constraint` as the fallback. |

## Not in scope

- Wiring the calculator into `schedulingService` and the worker, the `BOOKING_DATES_CHANGED` event and the API validation (PR 2).
- The editor (PR 3).
- A time zone per property, and applying a new automation to bookings that are already paid.

## What already exists

- The `schemaGuard` pattern, the migration `001` layout and the DSQL runbooks. They are reused, not rebuilt.
- `formatDate` in `automationService.js` already reads booking dates as UTC dates.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Code deployed before the migration | Automation reads fail | Guard test | `schemaGuard` 503, runbook order | Health check not ready |
| Constraint name differs | Old narrow constraint stays | No (database) | Runbook step 1 stops | Nothing until fixed |
| Property without check-in or check-out time | No time to anchor to | Yes | Fallback 15:00 and 11:00 | A message at the fallback time |
| Spring change: time falls in the skipped hour | Time does not exist | Yes | Moves forward | One hour later local time |
| Autumn change: time happens twice | Ambiguous time | Yes | First occurrence | Earlier of the two |
| Computed time already passed | Late send | Yes | Reported as `isPast` | Skipped in PR 2 |
| Rule the calculator cannot honour | Exception | Yes | Throws a clear error | Caught per automation in PR 2 |

## Verification

New tests were red first: 3 tests in the schema guard and entity suites failed, and the calculator suite could not load because the module did not exist; it then passed with 45 tests. `functions/AutomatedMessaging`: 12 suites, 135 tests passed. Full backend run: 455 suites and 6535 tests passed; the same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database. A mutation check (taking the later instead of the earlier occurrence in autumn) made the matching test fail, so the DST tests do catch a regression. Nothing was run against a real database; the SQL is untested until it is applied.

## Steps for the maintainer

No AWS command was run. Apply `002_add_stay_date_triggers.sql` to the `main` schema with the DSQL console or `psql` as Admin, one statement at a time, following `docs/internal/tools/dsql_automated_messaging_stay_date_triggers_runbook.md`, before this PR is merged. No IAM or EventBridge change is needed.
