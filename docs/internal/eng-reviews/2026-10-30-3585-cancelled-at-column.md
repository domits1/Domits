# #3585 feat(orm): add cancelled_at to the booking table

Pull request: this one
Issue: #3585
Reviewed commit: uncommitted changes on top of 8ea1b1358
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | backend/ORM/models/Booking.js:144 | Nothing stops a merge before the migration ran. Without the column, every booking read fails, and a change in `ORM/` deploys to all Lambdas. | Accepted. All columns here are applied by hand; the runbook and the pull request description say to apply it first. |
| P3 (7/10) | docs/internal/tools/dsql_booking_cancelled_at_runbook.md | Each `ALTER` makes warm Lambdas fail one statement with `40001` / `OC001`, and reads have no retry. | Accepted. A retry succeeds; run it in a quiet moment, as the runbook says. |

## Not in scope

- Writing and showing the date: the write paths and the page and receipt pull requests of #3585.
- Filling in old bookings: their real cancel moment is unknown, so they stay empty.
- An automatic check that the column exists before a deploy: nothing in the repository runs migrations yet.
