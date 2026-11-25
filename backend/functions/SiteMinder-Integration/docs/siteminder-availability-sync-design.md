# Design: send Domits availability to SiteMinder (#603, step 5)

Status: agreed with Enes on 23 November 2026. Step 1 is built (the shared night availability and `ARI_CHANGE_SOURCE`); steps 2 to 4 are not built yet.

## Problem

A villa that is linked to SiteMinder can also be booked in Domits directly, through Channex, or blocked by the host in the calendar. Today none of that reaches SiteMinder, so SiteMinder keeps selling nights that are already gone. SiteMinder's certification also expects the PMS to send the new availability after every reservation (step 5 in `siteminder-pmsxchange.md`).

Scope of this design: **availability only** (a night is open or closed). Rates and restrictions to SiteMinder use the same path later, see Not in scope.

## Decisions (agreed with Enes on 23 November 2026)

1. The "is this night available" logic is pulled out of `channexAriPayloadUtils.js` into a shared function, as a pure refactor commit. `channexAriPayloadSnapshot.test.js` and the other ARI tests stay green without edits. `DEFAULT_SELLABLE_UNIT_COUNT` becomes a parameter, because it is a Channex setting.
2. SiteMinder gets its own outbox table. It does not read the Channex rows: those are only written for listings mapped to Channex (`channexAriOutboxWriter.js:54`), and sharing them would tie SiteMinder to the Channex claim, cleanup and disconnect hold.
3. The write sites get one small class that forwards "availability changed" to the existing `ChannexAriOutboxWriter` (unchanged) and to a new SiteMinder writer. Each write site only swaps the object it gets.
4. The fan-out has a neutral `enqueueAriChange`, with no alias. The call at the write sites and their test mocks is renamed in the fan-out pull request.
5. One shared source list, `ARI_CHANGE_SOURCE`, imported by both writers, so the two cannot drift. It replaces `CHANNEX_ARI_OUTBOX_SOURCE` (step 1).
6. The SiteMinder writer also respects `SITEMINDER_AVAILABILITY_ENABLED`. It runs inside the booking transaction, so a bug there would roll back Domits bookings too; one switch turns SiteMinder fully off.

## How it fits together

```
 write site (inside its own transaction)
   reservationRepository, channexExternalBookingImportRepository,
   propertyCalendarOverrideRepository
        │ enqueueAriChange(manager, change)
        ▼
 AriChangeFanout ──────────────▶ ChannexAriOutboxWriter (unchanged) ──▶ channex_ari_outbox
        │
        └─────────────────────▶ SiteMinderAriOutboxWriter ──▶ siteminder_ari_outbox
                                  only when the property is linked     (same transaction)
                                  to an ACTIVE SiteMinder room type

 SiteMinder-Integration Lambda, task "push-availability", every minute
        │ claim PENDING rows per property
        ▼
 DomitsNightAvailability (shared, pure)  ◀── windows, calendar overrides, active bookings
        │ per night: open or closed, sellable units = 1 (one villa)
        ▼
 SiteMinderInventoryService.pushAvailability (existing, checks the mapping)
        │ OTA_HotelAvailNotifRQ, nights of the same value merged into ranges
        ▼
 SiteMinder ──▶ rows PROCESSED, or back to PENDING with a later attempt, or FAILED
```

## Step 1: shared night availability and source list (refactor only, built)

New file `.shared/channelManagement/utils/domitsNightAvailability.js` with the pieces that decide whether a night can be sold, moved as they are:

- `normalizeAvailabilityWindows`
- `getEffectiveAvailability` (a calendar override wins over the availability windows)
- `buildBookingAwareAvailability({ baseAvailability, activeBookingCount, sellableUnitCount })`: `sellableUnitCount` is now a parameter.

`channexAriPayloadUtils.js` imports them and passes `CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT`, so what Channex gets does not change. `countActiveBookingsByNight` stays where it is (`channexBookingAvailabilityBridge.js`) and is imported from there.

Proof that nothing changes: the snapshot and ARI tests pass without edits, in the same commit. A small new test covers the unit count as a parameter.

In a second commit `CHANNEX_ARI_OUTBOX_SOURCE` becomes `ARI_CHANGE_SOURCE` in `utils/ariChangeConstants.js`, with the same values. `URGENT_SOURCES` stays in the Channex constants and lists the same three sources.

## Step 2: SiteMinder outbox table and writer

`main.siteminder_ari_outbox` (and `test.`), following the Channex table and the DSQL rules (one DDL per transaction, no CHECK, `CREATE INDEX ASYNC`):

| Column | Type | Meaning |
| ------ | ---- | ------- |
| `id` | VARCHAR(255) PK | random UUID |
| `domitspropertyid` | VARCHAR(255) NOT NULL | the villa |
| `datefrom`, `dateto` | INTEGER NOT NULL | YYYYMMDD, like the Channex table |
| `source` | VARCHAR(30) NOT NULL | the same source values (`BOOKING`, `CALENDAR`, `CHANNEX_IMPORT`, `SITEMINDER_IMPORT`, ...) |
| `status` | VARCHAR(20) NOT NULL | `PENDING`, `PROCESSING`, `PROCESSED`, `SKIPPED`, `FAILED` |
| `attemptcount` | INTEGER NOT NULL | tries so far |
| `nextattemptat`, `createdat`, `updatedat`, `processedat` | BIGINT | ms |
| `failurereason` | TEXT | a fixed code, never the SiteMinder answer |

Indexes: `(status, domitspropertyid, createdat)` to claim, `(status, updatedat)` for stale and old rows.

`SiteMinderAriOutboxWriter.enqueueAriChange(manager, change)` writes one row inside the caller's transaction, only when `SITEMINDER_AVAILABILITY_ENABLED` is `true`, the change has the `availability` type, ends today or later, and the property is linked to an `ACTIVE` SiteMinder room type. Otherwise it writes nothing and touches no table, like the Channex writer does for unmapped listings.

## Step 3: the fan-out at the write sites

`AriChangeFanout` in `.shared/channelManagement/services/` has a neutral `enqueueAriChange(manager, change)`. The write sites call it instead of `enqueueChannexAriChange`, and their test mocks are renamed in the same pull request. It calls the Channex writer first, then the SiteMinder writer, in the same transaction. If either throws, the transaction rolls back, so a booking is never saved without its rows.

Write sites that swap `new ChannexAriOutboxWriter()` for `new AriChangeFanout()`:

| Write site | Why |
| ---------- | --- |
| `General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js` | Domits bookings and cancellations |
| `.shared/channelManagement/repositories/channexExternalBookingImportRepository.js` | Channex and SiteMinder imports |
| `PropertyHandler/data/repository/propertyCalendarOverrideRepository.js` | the host blocks or opens nights |

`propertyPricingRepository.js` (rates only), `propertyAvailabilityRestrictionRepository.js` (restrictions only) and `channexMappingService.js` (the Channex full sync) keep the Channex writer as they are. They move to the fan-out when rates and restrictions go to SiteMinder too.

## Step 4: the SiteMinder worker

A new task `push-availability` in the SiteMinder-Integration Lambda, behind its own kill switch `SITEMINDER_AVAILABILITY_ENABLED`, run every minute by its own EventBridge rule. Per run:

1. Return `PROCESSING` rows older than a stale limit to `PENDING` (a crashed run).
2. Claim the `PENDING` rows of up to N properties with one conditional `UPDATE` (DSQL optimistic concurrency: two runs never both win a row).
3. Per property: merge the date ranges of its rows, read the availability windows, calendar overrides and active bookings for that range, and compute every night with the shared function and `sellableUnitCount` 1 (one villa is one unit).
4. Find the SiteMinder hotel and room type of the villa, merge nights with the same value into ranges, and send them with `SiteMinderInventoryService.pushAvailability` (`BookingLimit` 1 or 0). The service already refuses a hotel or room type that is not mapped.
5. Mark the rows `PROCESSED`. A retryable SOAP error (`SiteMinderSoapError.retryable`) puts them back to `PENDING` with a later `nextattemptat`; after 5 tries, or for a non-retryable error or a mapping error, they become `FAILED` with a fixed code.

Because the worker always reads the current state and never the state at the time of the change, sending the same range twice is harmless, and two changes for the same nights become one call.

## Failure modes

| Path | Realistic failure | Handling | Visible |
| ---- | ----------------- | -------- | ------- |
| write | the SiteMinder writer fails | the whole transaction rolls back, the booking is not saved | yes, the caller gets the error |
| write | the villa is not linked to SiteMinder | no row | no |
| worker | SiteMinder times out or answers 5xx | back to `PENDING`, tried again later | no, unless it keeps failing |
| worker | SiteMinder refuses the message (SOAP fault) | `FAILED` with a fixed code, the run fails | yes, CloudWatch alarm |
| worker | the mapping changed after the row was written | `FAILED` with `SITEMINDER_UNKNOWN_CODES` or `SITEMINDER_HOTEL_NOT_MAPPED` | yes, CloudWatch |
| worker | the run crashes after the claim | the stale rows go back to `PENDING` on a later run | no |
| worker | two runs at the same time | the conditional claim lets only one win each row | no |

## Pull requests

1. Refactor: shared night availability. Pure move, no behaviour change, Enes as reviewer.
2. The SiteMinder outbox table (migration and runbook), the repository and the writer, with tests. Nothing writes to it yet.
3. `AriChangeFanout` and the four write sites, with tests that a change reaches both writers in one transaction. Enes as reviewer.
4. The worker task, its kill switch and the runbook update.

Each stays under 1000 lines. The schedule stays off until the certification.

## Not in scope

- Rates and restrictions to SiteMinder: the same outbox and worker with the `rates` and `restrictions` types, after availability works. `SiteMinderInventoryService` can already send both.
- A full sync when a villa is linked to SiteMinder (like the Channex `GO_LIVE`): needed before go-live, its own small pull request after step 4. It also covers the availability windows, which are only written when a listing is created.
- More than one unit per room type: Domits has one unit per villa.

## Answers from Enes (23 November 2026)

1. Availability windows are only written when a listing is created (`propertyService.create`), and there is no edit path. A new listing has no mapping yet, and the Channex go-live full sync covers its windows. For SiteMinder this only holds once its own go-live full sync exists (see Not in scope), so that comes before go-live. If an edit path is added later, it goes through the fan-out.
2. A neutral `enqueueAriChange`, no alias (decision 4).
3. One shared source list, `ARI_CHANGE_SOURCE` (decision 5), renamed in the refactor pull request.

He also asked for the kill switch in the SiteMinder writer (decision 6).
