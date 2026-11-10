# feat: let the booking import take a channel profile #603

Pull request: not opened yet (branch `feature/603-booking-import-profile`, on `acceptance`)
Issue: #603
Reviewed commit: 009892a2f
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

SiteMinder reservations have to be saved as Domits bookings, and `channexExternalBookingImportRepository.js` already does that for Channex. Instead of a copy, the channel values become a profile. Agreed with Achraf and Enes on 9 November 2026. Enes asked for: a test with a fixed booking id first, the refactor in its own commit, the profile passed once in the constructor, and the fallback name in `updateImportedBooking` too. All four are in this pull request, in that order.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) if broken | backend/functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js `buildDeterministicChannexBookingId` | If the Channex booking id changes, every imported Channex booking is created a second time at its next revision. The existing tests computed the expected id with the same function, so they would not notice. | Guarded: commit 27ba1f788 pins `641f53f0-3f43-4144-a518-67bde24c708f` for `integration-1` / `channex-booking-1`. A changed seed was tried by hand and fails that test. The id is unchanged after the refactor. |
| P4 (6/10) | the class name `ChannexExternalBookingImportRepository` | The class now serves other channels too but keeps the Channex name. | Accepted: renaming touches six files, UnifiedMessaging included. A rename can be its own small refactor later. |
| P4 (5/10) | backend/functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js `#saveWithOutbox` | The outbox to Channex still runs for any channel when `channexChanges` are passed. | Intended: Enes asked that SiteMinder imports also pass their availability change, so the nights close on the Channex OTAs when a property is on both. The writer only writes rows for Channex-mapped properties. That part comes with the SiteMinder step. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `buildDeterministicChannexBookingId` | the seed changes by accident | yes, fixed UUID | the test fails | no, caught before merge |
| constructor | a profile without one of its six fields | yes | throws when the repository is made | yes, at start |
| `createExternalBooking` / `updateImportedBooking` | another channel stores Channex values | yes | the values come from the profile | no |

## What already exists

- The whole import (insert, update, cancel, outbox in one transaction) is reused unchanged; only the six channel values moved into `CHANNEX_BOOKING_PROFILE`.
- `buildDeterministicChannexBookingId` stays exported with the same result, so `channexBookingRevisionImportService.js` and UnifiedMessaging do not change.

## Not in scope

- The SiteMinder profile and saving SiteMinder reservations: the next pull request.
- The `SITEMINDER_IMPORT` outbox source: with the SiteMinder step.
- `isChannexBooking` in the web app: a small separate pull request.
