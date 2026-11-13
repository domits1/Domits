# #3585 feat(bookings): store when a booking was cancelled

Pull request: #3750
Issue: #3585
Reviewed commit: 4a61102d7, and the review fix on top of 11a82f7db
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/.shared/channelManagement/services/channexBookingRevisionImportService.js:75 | The revision's `inserted_at` is when Channex created the revision, not the exact moment the guest cancelled on the OTA. | Accepted. It is the closest time we get, usually only seconds later. |
| P3 (7/10) | backend/functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js:34 | `Date.now()` is written into the SQL text instead of a parameter. | Accepted. It is always a number from our own code, and it keeps the expression next to the status. |
| P3 (7/10) | backend/test/General-Bookings-CRUD-Bookings-develop/reservationRepository.cancelledAt.test.js:56 | The tests check the generated SQL, not a real second cancel in a database. | Accepted. Tests here have no database; checked by hand after the deploy with a test booking. |
| P2 (9/10), found in review | backend/functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js:630 | A second guest cancel gave a booking cancelled before this change today's date, while the design says it shows none. | Fixed. A guest cancel on a cancelled booking no longer updates it. The refund step still runs and is safe: it reuses a stored refund id, and Stripe gets an idempotency key. |
| P3 (7/10) | backend/functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js:226 | A Channex cancel revision for an old cancelled booking still writes a date. | Accepted. It is the revision's real time, and it needs an old revision to arrive again. |

## Not in scope

- Showing the date: the reservation page and receipt pull request of #3585.
- Clearing the date when a cancelled booking becomes active again, as decided in the design.
