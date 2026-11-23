# feat: save SiteMinder reservations as Domits bookings #603

Pull request: not opened yet (branch `feature/603-siteminder-reservations-save`)
Issue: #603
Reviewed commits: 619a0344f (save, change, cancel), 00cf0ef36 (one run), 499c7c3ed (docs), e8d9fc17c (currency with the price)
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

Third step of receiving SiteMinder reservations, after reading them (#3806) and asking for and confirming them (#3813). It builds on #3841 (the booking import takes a channel profile), #3842 (one room type is one Domits property) and #3964 (the booking plan, the outbox source and skipping reservations without ids).

Saving came to more than 1100 lines with its tests, so it was split in two. #3964 held the small pieces and their findings (`2026-11-18-603-siteminder-booking-plan.md`). This pull request is the rest: saving, changing and cancelling the bookings, and one run that reads, saves and confirms.

Enes's conditions for reusing `channexExternalBookingImportRepository.js` (9 November 2026): the fixed-id test, the refactor in its own commit and the profile in the constructor came in #3841. #3964 added the `SITEMINDER_IMPORT` source in `URGENT_SOURCES`; this pull request writes those rows, so nights close on Channex too. The frontend `isChannexBooking` pull request is still open (see Not in scope).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:112 | Since #3915 a booking keeps the currency of its price, and a booking without one counts as euros. The importer saved the price without its currency, so with `SITEMINDER_CURRENCY` set to GBP a price in pounds would show as euros. | Fixed in e8d9fc17c: the currency goes with the price, and no currency without a price, so the two stay a pair. Tested for a new booking, a change and a price in another currency. |
| P3 (7/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:65 | There is no check whether the nights are already taken in Domits, so a SiteMinder booking can overlap another booking. | Accepted: the Channex import does the same, and SiteMinder's channel already sold the stay. How to warn the host is a product decision for Stefan. The `SITEMINDER_IMPORT` outbox row closes the nights on Channex at once, which keeps the window small. |
| P4 (6/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:120 | When a room type is linked to another Domits property after the booking was saved, a change updates the dates of the booking on the old property. | Accepted: the mapping refuses a room type that is already linked to another property, so this only happens when the host unlinks and relinks between a booking and its change. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:58 | A cancel for a reservation Domits never saved is confirmed with the deterministic id of the reservation, not with a real booking id. | Accepted: there is no booking to name, and SiteMinder needs an id to confirm. The id is stable, so a second delivery gets the same one. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| import | the hotel or a room type is not linked | yes | nothing saved, reported to SiteMinder with code 392 or 402 | yes, SiteMinder shows the failed reservation to the hotel |
| import | the database fails halfway through a reservation for two villas | partly: a failing save is tested for one room, and saving the same rooms again is tested | the error goes up, the reservation stays unconfirmed and comes back; saving again updates the saved room and saves the other one | no, it is saved on the next run |
| import | SiteMinder delivers the same Book, Modify or Cancel again | yes | the deterministic booking id and the reservation link make it a no-op | no |
| import | a change removes a room | yes | that room is cancelled and its nights open again | yes, the booking shows as cancelled |
| import | the host unlinks a room type, then the guest cancels | yes | the rooms come from the reservation link, so the booking is still cancelled | yes |
| run | the failure report does not reach SiteMinder | yes | counted in `retryLater`, comes back next run | no |
| run | the confirmation does not reach SiteMinder | yes | the run fails; the saved reservations come back and are saved again without a second booking | yes, in CloudWatch |

## What already exists

- `ChannexExternalBookingImportRepository` with a profile (#3841) writes the bookings and the outbox rows in one transaction.
- `buildDeterministicBookingId` gives the booking ids.
- `bookingAvailabilityChange` and the Channex ARI outbox close and open the nights on Channex.
- `channel_reservation_link` and `ReservationLinkRepository`, as used by the Channex import, hold the rooms of a reservation.
- `SiteMinderReservationsReader` (#3813) sends the read, the confirmation and the failure report.

## Not in scope

- The Lambda handler and the schedule (every 2 to 5 minutes): the next pull request.
- Sending the new availability to SiteMinder after a reservation (step 5 in the docs).
- Warning the host about an overbooking: a product decision for Stefan.
- `isChannexBooking` in the frontend only knows `channex`, so a SiteMinder booking shows like a direct booking: a small frontend pull request, as agreed with Enes.
