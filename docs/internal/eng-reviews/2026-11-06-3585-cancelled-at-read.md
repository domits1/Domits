# #3585 fix(hostdashboard): show the cancel date of a cancelled reservation

Pull request: to be opened
Issue: #3585
Reviewed: the staged diff on `fix/3585-cancelled-at-read`, and the receipt fix on top of it
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10), found in review | frontend/web/src/features/hostdashboard/HostReservationDetails.js:777 | The receipt PDF printed "Reservation cancelled" with the booking date as its payment date, the same bug as the page. | Fixed. The page and the receipt share `resolvePaymentDate`: the cancel date for a cancelled reservation, the booking date otherwise. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/HostReservationDetails.cancelledAt.test.js:47 | The test reads the date from the span right after the status text, so a layout change breaks it. | Accepted. A layout change makes it fail, never pass wrongly. |

## Checked

- Both spellings, "Cancelled" and "Canceled", normalise to `CANCELLED` (`normalizeStatus`), so both follow the new rule.
- The host bookings endpoint (`readByHostId`) loads whole Booking entities, so `cancelled_at` already reaches the page. No backend change.
- While the page loads the status is not known yet, so the loading text is unchanged.
- The date is shown in the host's local time; the tests use noon UTC so they pass in any time zone.

## Not in scope

- The mobile app and the guest reservation page: neither shows a booked or cancel date.
- A separate "Cancelled on" line on the receipt: the payment date line now carries the cancel date, the same as the page.
- Clearing the date when a cancelled booking becomes active again, as decided in the write-paths design.
