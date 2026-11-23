# feat: plan one Domits booking per SiteMinder villa #603

Pull request: not opened yet (branch `feature/603-siteminder-booking-plan`)
Issue: #603
Reviewed commits: 5b8a950c6 (outbox source), 7725b0849 (booking plan), c03299158 (skip reservations without ids)
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

## Why this is its own pull request

Saving SiteMinder reservations came to more than 1100 lines with its tests, which is too big to review in one go. It is split in two:

1. This pull request: the pieces the saving needs, each small and tested on its own. Nothing calls `planReservationBookings` and nothing writes a `SITEMINDER_IMPORT` row yet.
2. The next pull request (`feature/603-siteminder-reservations-save`): saving, changing and cancelling the bookings, and one run that reads, saves and confirms.

What is in this one:

- `SITEMINDER_IMPORT` as a Channex ARI outbox source, urgent like `CHANNEX_IMPORT`, so the nights of a SiteMinder booking close on Channex without the quiet period (one of Enes's conditions for reusing the booking import).
- `planReservationBookings`: one Domits booking per room (one room type is one villa, #3842), or a fixed error that SiteMinder shows to the hotel.
- `readReservations` skips and counts a reservation without a SiteMinder id or message id, instead of failing the whole read.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/ChannelManagement/tests/channexAriOutboxConstants.test.js `URGENT_SOURCES` | The existing test used `toEqual`, which also passed with a missing value at the end of the list, so it would not have caught a missing `SITEMINDER_IMPORT`. | Fixed before the commit: the test uses `toStrictEqual`, and it failed before the change. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/util/reservationBookings.js:23 `code: 321` | Code 321 ("Required field missing") is also used for stay dates that are present but wrong. SiteMinder's table has no closer code. | Accepted: checked in the certification, like the `ResID_Value` point Mehedi raised on #3813. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/util/reservationBookings.js:59 `if (total?.currency !== currency)` | A room total in another currency than `SITEMINDER_CURRENCY` saves no price. | Accepted on purpose: no price is better than a wrong one. Now that bookings can keep their own currency (#3915), the next step can pass it instead. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| plan | the hotel or a room type is not linked | yes | a fixed error with code 392 or 402, no booking planned | yes, SiteMinder shows it to the hotel once the saving step reports it |
| plan | no rooms, or departure not after arrival | yes | a fixed error with code 321 | yes, to the hotel |
| plan | two rooms of the same room type | yes | two bookings with room keys `:1` and `:2`, the same keys in any order | no |
| read | one reservation without ids in the answer | yes | skipped and counted in `skipped`, the others are read | no, SiteMinder fails it to the hotel after 20 reads |
| outbox | a `SITEMINDER_IMPORT` row for a property without a Channex mapping | yes (existing) | the worker skips it as `NOT_MAPPED` | no |

## What already exists

- The Channex ARI outbox and its urgent sources; `SITEMINDER_IMPORT` is added to the existing list.
- The room type to Domits property mapping from #3842.

## Not in scope

- Saving the bookings and the run: the next pull request.
- The Lambda handler and the schedule: `feature/603-siteminder-reservations-schedule`, after that.
