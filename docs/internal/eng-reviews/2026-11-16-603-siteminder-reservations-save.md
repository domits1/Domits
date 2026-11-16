# feat: save SiteMinder reservations as Domits bookings #603

Pull request: not opened yet (branch `feature/603-siteminder-reservations-save`)
Issue: #603
Reviewed commits: 226f769ff (outbox source), fef7f1262 (booking plan), 619a0344f (save, change, cancel), ea008503d (skip reservations without ids), 00cf0ef36 (one run), 499c7c3ed (docs)
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

Third step of receiving SiteMinder reservations, after reading them (#3806) and asking for and confirming them (#3813). It builds on #3813, #3841 (the booking import takes a channel profile) and #3842 (one room type is one Domits property). Until those three are merged, this branch holds them as merges; the pull request is opened after they are in, so the diff only shows this step.

Enes's conditions for reusing `channexExternalBookingImportRepository.js` (9 November 2026): the fixed-id test, the refactor in its own commit and the profile in the constructor came in #3841. This pull request adds the `SITEMINDER_IMPORT` source in `URGENT_SOURCES`, so nights close on Channex too. The frontend `isChannexBooking` pull request is still open (see Not in scope).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/ChannelManagement/tests/channexAriOutboxConstants.test.js `URGENT_SOURCES` | The existing test used `toEqual`, which also passed with a missing value at the end of the list, so it would not have caught a missing `SITEMINDER_IMPORT`. | Fixed before the commit: the test uses `toStrictEqual`, and it failed before the change. |
| P3 (7/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:65 | There is no check whether the nights are already taken in Domits, so a SiteMinder booking can overlap another booking. | Accepted: the Channex import does the same, and SiteMinder's channel already sold the stay. How to warn the host is a product decision for Stefan. The `SITEMINDER_IMPORT` outbox row closes the nights on Channex at once, which keeps the window small. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/util/reservationBookings.js:23 `code: 321` | Code 321 ("Required field missing") is also used for stay dates that are present but wrong. SiteMinder's table has no closer code. | Accepted: checked in the certification, like the `ResID_Value` point Mehedi raised on #3813. |
| P4 (6/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:120 | When a room type is linked to another Domits property after the booking was saved, a change updates the dates of the booking on the old property. | Accepted: the mapping refuses a room type that is already linked to another property, so this only happens when the host unlinks and relinks between a booking and its change. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js:58 | A cancel for a reservation Domits never saved is confirmed with the deterministic id of the reservation, not with a real booking id. | Accepted: there is no booking to name, and SiteMinder needs an id to confirm. The id is stable, so a second delivery gets the same one. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/util/reservationBookings.js:62 | A room total in another currency than `SITEMINDER_CURRENCY` saves no price. | Accepted on purpose: no price is better than a wrong one. The host still sees the booking. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| import | the hotel or a room type is not linked | yes | nothing saved, reported to SiteMinder with code 392 or 402 | yes, SiteMinder shows the failed reservation to the hotel |
| import | a stay without valid dates | yes | nothing saved, reported with code 321 | yes, to the hotel |
| import | the database fails halfway through a reservation for two villas | partly: a failing save is tested for one room, and saving the same rooms again is tested | the error goes up, the reservation stays unconfirmed and comes back; saving again updates the saved room and saves the other one | no, it is saved on the next run |
| import | SiteMinder delivers the same Book, Modify or Cancel again | yes | the deterministic booking id and the reservation link make it a no-op | no |
| import | a change removes a room | yes | that room is cancelled and its nights open again | yes, the booking shows as cancelled |
| import | the host unlinks a room type, then the guest cancels | yes | the rooms come from the reservation link, so the booking is still cancelled | yes |
| read | one reservation without ids in the answer | yes | skipped and counted in `skipped`, the others are saved | no, SiteMinder fails it to the hotel after 20 reads |
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
