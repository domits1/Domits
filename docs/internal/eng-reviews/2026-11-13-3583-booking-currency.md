# feat(orm): store the currency of a booking

Pull request: (to be linked)
Issue: #3583 (sub-issue of #3579); this pull request adds only the column, a second one writes and shows it
Reviewed commit: staged diff per commit on `feat/3583-booking-currency-column`
Result: no blocking findings

```
Channex revision (amount, currency)
        ▼  next PR: import stores both
booking.total_price + booking.currency   (empty currency = EUR: old rows, Domits bookings)
        ▼  next PR
list / details / receipt show "£250.00"     PriceLabs + missed revenue skip non-EUR (decision A)
```

## Findings

### Commit 1: `currency` column (entity, `schema.psql`, migration, tests)

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `backend/ORM/models/Booking.js`, `currency` | TypeORM selects every mapped column on every booking read, and a change under `backend/ORM/` redeploys every Lambda. If this merges before the column exists in both schemas, every booking read fails with `42703`. | Same as `cancelled_at`: a runbook in this pull request says to apply the `.sql` to `test` and `main` before merging. Not a code defect. |
| Checked | `20261113_booking_currency.sql` | Copies the `cancelled_at` script: column check, `sys.jobs` check, one `ALTER` per schema without `BEGIN`, column and `SELECT` check afterwards. A nullable column with no default needs no backfill, so the `ALTER` is metadata only. | No change. |
| Checked | `schema.psql` | `main.booking` gets the column in its `CREATE TABLE`, `test.booking` an appended `ALTER`, matching how the other late columns are listed; the existing schema tests compare both blocks with the entity. | No change. |
| P3 (6/10) | `Booking.js`, `currency` | No `CHECK` on the format, so a lowercase or wrong code could be stored. | Accepted: the import in the next pull request validates the code; the entity has no `CHECK` on any other column either. |
| P3 (7/10) | `20261113_booking_currency.js` | Only the hand-run `.sql` is tested; the `.js` could drift from it. | Accepted: same as the `cancelled_at` and `refund_status` migrations; the `.sql` is what gets applied. |

### Commit 2: runbook `docs/internal/tools/dsql_booking_currency_runbook.md` and this record

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | runbook, Steps | The steps match the `.sql` file in order (column check, jobs check, two `ALTER`s, column check, two `SELECT`s); step 4 names `character_maximum_length`, which the script selects. | No change. |
| Checked | runbook, "Apply it to both schemas before the pull request merges" | Answers the P2 of commit 1: apply before merge, because the `backend/ORM/` change redeploys every Lambda. | No change. |

## Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Merged before the column exists | No (needs the database) | Runbook order: apply, then merge | Every booking read errors, on every Lambda; caught by the runbook's `SELECT currency` check before merging |
| `ALTER` while Lambdas run | No | DSQL OCC: a warm Lambda fails its next statement once with `40001`, a retry succeeds | One failed request per warm Lambda; apply in a quiet moment |

## Not in scope

- Writing the currency on import and showing it: the second pull request.
- PriceLabs and missed revenue: skip non-EUR bookings (decision A), second pull request.
- Filling the currency of existing Channex bookings: #3582 (backfill).
- Exchange-rate conversion: out of #3583.

## What already exists

The `cancelled_at` migration (#3585) and its runbook are reused one to one; `schemaSql.js` test helpers check the schema file against the entity.
