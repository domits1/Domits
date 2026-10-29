# Store when a booking was cancelled

Issue: #3585
Status: design, not built yet

## Problem

The host reservation page shows "Reservation cancelled" next to a date, but that date is the booking date (`bookedOn`, `HostReservationDetails.js:684-690` and `1357-1359`). A booking made on 13 October and cancelled on 14 October shows "Reservation cancelled 13 Oct". The `booking` table has no column for the moment of cancellation, so the page has no right date to show.

## Goal

- A cancelled booking shows the date it was cancelled.
- A booking cancelled before this change has no cancel date and shows none, rather than a wrong one.

Not in scope: who cancelled (guest, host or OTA), and cancellation fees or refunds.

## Design

### 1. Column

`booking.cancelled_at`: bigint, epoch milliseconds, nullable. Same type as `createdat`, same naming style as the newer columns (`total_price`, `booking_source`). No default: existing rows stay empty.

Migration following the existing pattern (for example `20260924_booking_special_request`): a `.sql` file, a `_rollback.sql` file and a `.js` file in `backend/ORM/migrations/`, plus the field in `backend/ORM/models/Booking.js`.

### 2. Writing it

A booking becomes "Cancelled" in three places. Each sets `cancelled_at` in the same update as the status, and only when it is still empty, so a repeated call keeps the first moment.

| Place | Who cancels | Time stored |
|---|---|---|
| `reservationRepository.js` `updateBookingStatus` (called from `bookingService.js:498`) | Domits, when the status is set to Cancelled | now |
| `reservationRepository.js:640` (guest cancel) | The guest on Domits | now |
| `channexExternalBookingImportRepository.js:238` | An OTA, through a Channex cancellation revision | the revision's `inserted_at` from Channex, or now when it is missing |

`updateBookingStatus` also sets other statuses; it only writes `cancelled_at` when the new status is Cancelled.

### 3. Reading and showing it

- The booking reads used by the host pages return all columns, so `cancelled_at` comes along. Check this for `readByHostId` and the single booking read while building.
- `HostReservationDetails.js`, payment box: cancelled with `cancelled_at` shows "Reservation cancelled" and that date; cancelled without it shows only "Reservation cancelled"; other statuses keep the booking date as now.
- Receipt PDF (`downloadReservationReceiptPdf.js`): a line "Cancelled on <date>" when `cancelled_at` is set.

## Order

| Pull request | Contents | Notes |
|---|---|---|
| 1 | Migration and model | Run the migration on Aurora DSQL before any code writes the column. A change in `backend/ORM/` starts a deploy of all Lambdas (`deploy.yml:79-82`). |
| 2 | The three write paths, with tests | Review by the owner of General-Bookings |
| 3 | Reservation page and receipt, with tests | Old bookings without a date show no date |

Merge one at a time and wait for each deploy.

## Tests

- Domits cancel and guest cancel set `cancelled_at`; a second cancel keeps the first value; other status changes leave it empty.
- A Channex cancellation stores the revision time; a repeated revision keeps the first value; a missing revision time falls back to now.
- The reservation page shows the cancel date when present, no date when missing, and the booking date for other statuses.

## Open questions

1. Who owns General-Bookings, to agree and review pull request 2?
2. Should a cancellation that Channex sends for a booking Domits already cancelled keep the Domits time? The design says yes (first value wins).
3. Timing: after the interim report (6 November).
