# #3585 feat(bookings): store when a booking was cancelled

Pull request: this one
Issue: #3585
Reviewed commit: uncommitted changes on top of 0edb38596
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/.shared/channelManagement/services/channexBookingRevisionImportService.js:75 | The revision's `inserted_at` is when Channex created the revision, not the exact moment the guest cancelled on the OTA. | Accepted. It is the closest time we get, usually only seconds later. |
| P3 (7/10) | backend/functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js:35 | `Date.now()` is written into the SQL text instead of a parameter. | Accepted. It is always a number from our own code, and it keeps the expression next to the status. |
| P3 (7/10) | backend/test/General-Bookings-CRUD-Bookings-develop/reservationRepository.cancelledAt.test.js:46 | The tests check the generated SQL, not a real second cancel in a database. | Accepted. Tests here have no database; checked by hand after the deploy with a test booking. |

## Not in scope

- Showing the date: the reservation page and receipt pull request of #3585.
- Clearing the date when a cancelled booking becomes active again, as decided in the design.
