# Channex ARI outbox: design note

| | |
|---|---|
| Issue | #3278 (parent #2861, capability #440) |
| Related | #3280 retry and back-off, #3282 full sync, #3281 booking webhook, #3284 certification cleanup, #2869 monitoring |
| Author | Enes Veli Yigit |
| Status | Draft, waiting for senior review. No implementation before approval. |
| Date | 22 September 2026 |

## 1. Summary

Today every host change that affects availability, rates or restrictions (ARI) calls Channex inline and waits for the answer. This note replaces that with a transactional outbox: the change and a small "this changed" row are saved in one transaction, and a worker in the `ChannelManagement` Lambda sends pending changes to Channex once a minute, merged per property and within Channex's rate limit.

The design reuses the outbox pattern Domits already runs for booking automation (`BookingAutomationOutbox`) and the lock Domits already runs for Channex booking polling (`IntegrationSyncState`). The new parts are: batching per property, a quiet period before sending, a per-property lock, and enqueueing from four write sites.

## 2. Problem

### 2.1 How it works today

```
Host saves a price
   │
   ▼
Domits saves it
   │
   ▼
Domits calls Channex  ◀── the host waits here
   │
   ▼
Host gets an answer
```

| Where the host or a guest changes something | What happens today |
|---|---|
| Calendar: host saves a price, availability or restriction | Domits calls Channex and waits for the answer |
| Global settings: host changes the base price or restrictions | The same, for the next 500 days |
| Booking: created, paid or cancelled | The same, for the booked dates |
| Booking imported from Channex (for example from Booking.com) | The same, so the other channels close those dates |

If a call fails, the error is labelled and nothing tries again.

*Code:* calendar `PropertyHandler/controller/propertyController.js:638` → `notifyChannexCalendarOverrideChange` (`:727`); global settings `propertyController.js:547` → `notifyChannexOverviewCalendarChange` (`:778`); bookings `General-Bookings-CRUD-Bookings-develop/business/bookingService.js:157, 418, 471`; import `.shared/channelManagement/services/channexBookingRevisionImportService.js:1019`; a 429 becomes `RATE_LIMITED` in `.shared/channelManagement/providers/channex/providerClient.js:92-93`.

### 2.2 What is wrong with that

1. **Too many calls.** Every save is its own Channex call. Channex allows 10 availability and 10 restriction/price requests per minute **per property** and answers 429 above that.
2. **No merging.** Certification scenarios 3, 4, 7 and 8 each require one API call for several dates or ranges.
3. **Lost changes.** If the call fails, the change is not stored anywhere to send later.
4. **The host waits** for an external service on every save.

### 2.3 Requirements and their sources

| Requirement | Who asks for it |
|---|---|
| Queue the sync work | Domits, #440 |
| Retry failed syncs | Domits, #440 (built in #3280) |
| An outbox between Domits and Channex, not a direct call | Channex pre-flight question 2 |
| A queue or limiter, so Channex is not spammed | Channex scenario 12 |
| One call for several dates | Channex scenarios 3, 4, 7 and 8 |
| Only send what changed; a full sync at most once a day | Channex scenario 13 |
| At most 10 availability and 10 price/restriction calls per minute per property | Channex rate limits |

*Quotes:*
- #440: "As a system, I want to queue synchronization jobs to handle large volumes efficiently." and "As a system, I want to retry failed syncs automatically."
- Pre-flight: "Do you have an outbox/queue between your PMS and the Channex client, or does your code call the Channex API directly from the save handler?"
- Scenario 12: "make sure you have a queue or limiter to not spam our API endpoints"
- Scenarios 3, 4, 7, 8: "1 API call"
- Scenario 13: "We require partners to only send changes to availability and prices. Full sync is allowed once every 24h if required"

## 3. Goals and non-goals

**Goals**
- A save stores the change and its outbox row in one transaction and returns without calling Channex.
- A worker sends pending changes, merged per property, at most one availability and one restrictions call per property per run.
- Pre-flight questions 1 and 2 can be answered "yes" with a file path; scenarios 3, 4, 7 and 8 produce one call each.
- Every push is auditable afterwards (what was sent, when, which Channex task).

**Non-goals (separate issues, but the design leaves room for them)**
- Retry timing, back-off and `Retry-After` handling: #3280. This design adds the `nextAttemptAt` column and the error classification hook.
- Full sync triggers (go-live, recovery, nightly): #3282. This design adds the `FULL_SYNC` kind.
- The booking webhook: #3281.

## 4. What already exists and is reused

| What Domits already has | What this design uses it for |
|---|---|
| 1. An outbox table for booking messages | The shape of the new table: status, attempt count, failure reason, timestamps |
| 2. Saving a booking and its outbox row in one transaction | The same "change and row together" rule |
| 3. Emptying that outbox safely, including rows left by a crashed run | Claiming rows safely on Aurora DSQL |
| 4. A schedule that wakes a Lambda every minute | Waking the worker |
| 5. A check that refuses to run before the table exists | The same check for the new table |
| 6. A lock that another run can take over after 5 minutes | The lock per property |
| 7. Code that builds and sends availability, prices and restrictions | Reading the current values and sending them |
| 8. The link between a Domits property and a Channex property | "Is this a Channex property?" |

*Code:*
1. `backend/ORM/models/automation/BookingAutomationOutbox.js`, created by `AutomatedMessaging/migrations/001_create_automated_messaging_v1.sql:50-68`
2. `General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js:440` (`markBookingPaidWithOutbox`, `client.transaction` at `:442`)
3. `AutomatedMessaging/data/outboxRepository.js:5` (`listProcessable`), `:24` (`claim`, `affected === 1`)
4. `AutomatedMessaging/index.js:123` (`{ action: "PROCESS_BOOKING_PAID_OUTBOX" }`), EventBridge `rate(1 minute)`
5. `AutomatedMessaging/business/schemaGuard.js:37` (`assertReady`)
6. `.shared/integrations/repositories/integrationSyncRepository.js:56` (`tryAcquireLock`), `:85` (`releaseLock`), table `integration_sync_state`
7. `.shared/channelManagement/services/channexAvailabilitySyncService.js:328` (`buildChannexCalendarChangePayloadPlan`), `utils/channexAriPayloadUtils.js` (`combineChannexAvailabilitySyncPayloadsForProvider`), `providerClient.js:698` (`pushAvailability`), `:718` (`pushRestrictions`)
8. `channel_integration_property` (`domitsPropertyId`, `status`) joined to `channel_integration_account` (`channel`, `status`)

## 5. Decisions

Each decision lists what was chosen, why, and what was rejected.

**D1. An outbox row is a marker ("this changed"), not a snapshot of the value.**
The worker reads the current value from the database when it sends. Sending the latest value makes duplicates and out-of-order processing harmless, because pushes send state per date, not a difference (idempotent, at-least-once delivery is acceptable). Rejected: storing the value in the row, because an older row processed after a newer one would push a stale value to Channex.

**D2. One row per save.**
A row holds a property, a date range and the change types. Rejected: one row per date (a 500-day change becomes 500 rows) and one row per property (the worker would have to send everything on every change, which is a full sync on every save and violates scenario 13).

**D3. Send after 60 seconds of quiet per property, at most 5 minutes after the oldest pending row. Bookings skip the quiet period.**
A host saving December to April month by month (the calendar selects within one month, `hostcalen/hooks/useCalendarSelection.js:739-741`) produces several rows; waiting for quiet merges them into one call, which scenarios 3 and 8 need. The 5-minute cap prevents starvation for a host who keeps saving. Rejected: sending whatever is pending every minute (scenario 8 would split over several runs) and relying only on multi-month calendar selection (scenario 3 still needs batching).

Rows with source `BOOKING` or `CHANNEX_IMPORT` are ready on the next run, without the quiet period. A booking closes dates, and every minute those dates stay open on the other channels is a double-booking risk, which is exactly what D8 is for. Waiting up to 5 minutes would make that risk larger than it is today, where the call happens during the request. Accepted consequence: a booking is now pushed up to about 60 seconds later instead of immediately, because the worker runs once a minute. Rejected: invoking the worker directly from the booking transaction (that restores the coupling the outbox removes) and giving bookings their own shorter quiet period (added complexity for a case where merging has no value, since a booking covers one contiguous stay).

**D4. The rate limit is guaranteed by construction, not by counting.**
A run sends at most one availability call and one restrictions call per property, and runs once a minute, so a property receives at most one call of each type per minute from the worker. Rejected: a counter table (extra writes and DSQL conflicts) and an in-memory counter (a Lambda keeps no memory between runs and concurrent runs cannot see each other).

**D5. The worker runs in the `ChannelManagement` Lambda.**
Background calls to Channex, including back-off, must not share capacity, timeouts or logs with the guest and host inbox in `UnifiedMessaging`. `ChannelManagement` already exists, uses the same shared code (`.shared/channelManagement`) and its role already has what the worker needs (section 9). Rejected: `UnifiedMessaging` (couples Channex batch work to real-time messaging) and a new Lambda (`ChannelManagement` already exists).

**D6. The date range is stored as `dateFrom` and `dateTo`, integers in `YYYYMMDD`.**
Every write site produces a contiguous range (a calendar selection, a booking stay, a forward range). `dateTo` is inclusive: it is the last date that changed. For a booking that is the **last night**, not the checkout date, which is what the current booking sync already sends (`buildBookingNightDateKeys` loops up to but not including the departure date, `channexBookingAvailabilityBridge.js:103-112`). The outbox keeps that behaviour. Integers match `calendar_date` in `property_calendar_override`, so the write sites store them without conversion. The existing payload builders take ISO dates (`channexAriPayloadService.js:652`), so the worker converts to ISO only when it calls them. Rejected: a JSON list of dates (unbounded size, not indexable).

**D7. A per-property lock in `integration_sync_state`.**
The worker takes a lock with `syncType = "channex_ari:<domitsPropertyId>"` for the property's Channex integration account before it claims rows. Two runs never send for the same property at the same time, so a slow earlier push cannot land after a newer one and overwrite it. The existing `tryAcquireLock` takes over a lock older than 5 minutes, which recovers from a crashed run. Rejected: claiming rows only (two overlapping runs could each claim different rows for the same property and race over the network) and a new lock table (the existing one is proven on DSQL). A `syncType` per property follows the booking poll, which locks with `booking_poll:<domitsPropertyId>` (`channexBookingPollingService.js:87`, `CHANNEX_BOOKING_POLL_SYNC_TYPE = "booking_poll"` in `utils/channexBookingPollUtils.js:3`).

**D8. Every write site writes its row in the same transaction as the domain change.**
Rule: no domain write that affects ARI without its outbox row in the same transaction. The booking lifecycle and the Channex import are the most sensitive: a missing row leaves booked dates open on the other channels, which is a double-booking risk. Domits is the master calendar, so an imported Booking.com booking only closes dates on Airbnb or Expedia if Domits pushes the new availability. Rejected: writing the row after the domain write with the daily full sync as a safety net (a gap of up to 24 hours for bookings).

**D9. Ranges are merged only when they touch or overlap.**
1–3 and 2–5 November become 1–5; 1–3 and 20–22 November stay separate entries in the same call. Channex supports several entries in one call (scenario 4: "1 API call with multiple details inside"). Rejected: one enclosing range (sends untouched dates, which Channex testers see as updates they did not make).

**D10. Rows are only written for properties with an active Channex mapping.**
The write site checks the mapping in the same transaction. Almost no property is mapped today, so writing rows for every save would fill the table with rows that are never sent. A change made just before a property is mapped is covered by the go-live full sync (#3282), which sends the complete current state.

**D11. Rollout in three steps, without a feature flag.**
1. Table, migration and worker (no rows yet, so the worker does nothing).
2. Infrastructure: timeout, schedule, invoke permission; confirm the worker runs empty every minute.
3. Switch the write sites from the inline call to writing rows.
Each step is its own pull request and is green on its own. If step 3 lands before step 2, rows pile up as `PENDING` and are sent once the schedule exists: the mistake costs delay, not data. No flag: every step is safe on its own, and no production host uses Channex yet.

## 6. Data model

Table `main.channex_ari_outbox`, created by a migration in `ChannelManagement/migrations/`, following `AutomatedMessaging/migrations/001_create_automated_messaging_v1.sql`.

Column names follow `booking_automation_outbox`: lowercase without separators (`bookingid`, `attemptcount`), with the camelCase property mapped through `name:` in the ORM model, as in `BookingAutomationOutbox.js:16-21`. The repository mixes three conventions (that one, `calendar_date` in snake_case, and TypeORM defaults in `ChannelIntegrationProperty`); this table copies the outbox it is modelled on.

| Column | What it holds | Type |
|---|---|---|
| `id` | A unique id for the row | varchar, primary key |
| `domitspropertyid` | Which property changed (D2) | varchar, not null |
| `kind` | A normal change, or a full sync (#3282) | varchar, not null: `CHANGE` or `FULL_SYNC` |
| `changetypes` | What changed: availability, rates, restrictions | varchar, not null: comma list |
| `datefrom` / `dateto` | First and last changed date (D6) | integer, not null: `YYYYMMDD` |
| `source` | Where the change came from, for debugging | varchar, not null: `CALENDAR`, `GLOBAL_SETTINGS`, `BOOKING`, `CHANNEX_IMPORT` |
| `status` | Where the row is in its life (see below) | varchar, not null |
| `attemptcount` | How often the worker tried to send it | integer, default 0 |
| `nextattemptat` | Do not try again before this time (#3280) | bigint ms, nullable |
| `failurereason` | Why it failed or was skipped | text, nullable |
| `sentsummary` | What was sent and what Channex answered: dates, values, task ids, HTTP status | text (JSON), nullable |
| `createdat` / `updatedat` / `processedat` | When the row was made, last changed and sent | bigint ms, as in the booking outbox |

The life of a row:

```
PENDING ──▶ PROCESSING ──▶ PROCESSED   sent
                      ├──▶ FAILED      will not work by retrying (for example a rejected API key)
                      └──▶ PENDING     try again later (429, 5xx, timeout)
PENDING ──▶ SKIPPED                    the property is no longer linked to Channex
```

Indexes, in the style of the existing migration:
- `(status, domitspropertyid, createdat)` for finding ready properties and claiming their rows.
- `(status, updatedat)` for finding stale `PROCESSING` rows and for cleanup.

Deliberately absent: the values (D1) and a "claimed by" column (D7 locks the property instead).

The worker adds the table to its schema guard, as `AutomatedMessaging/business/schemaGuard.js` does, so it refuses to run before the migration is applied.

## 7. Write side

A small shared writer in `.shared/channelManagement/` is called by every write site from inside its own transaction:

```
enqueueChannexAriChange(transactionManager, { domitsPropertyId, kind, changeTypes, dateFrom, dateTo, source })
   1. check: an ACTIVE channel_integration_property for this property, on a CHANNEX account that is connected (D10)
      no mapping → return without writing
   2. insert one channex_ari_outbox row with status PENDING
```

| Write site | Uses a transaction today? | What changes |
|---|---|---|
| Calendar save | Yes | Call the writer inside the existing transaction |
| Global settings | No: the save runs separate writes for title, capacity, pricing, restrictions, amenities and more | Only pricing and restrictions affect ARI. Wrap each of those two with the writer in a transaction; the range is today plus 500 days |
| Booking | Only for "mark as paid" and "accept inquiry" | Add transactions to the other paths (create, cancel) |
| Channex import | No | Add a transaction around create, update and cancel |

*Code:* calendar `PropertyHandler/data/repository/propertyCalendarOverrideRepository.js:256`; global settings `propertyService.updatePropertyOverview` with `updatePricing` and `updateAvailabilityRestrictions`, 500 days from `CHANNEX_GLOBAL_CALENDAR_CHANGE_SYNC_DAYS` (`propertyController.js:70`); booking `markBookingPaidWithOutbox` (`reservationRepository.js:442`) and `acceptInquiryWithOverlapDecline` (`:496`); import `channexExternalBookingImportRepository.js:91, 151, 177`.

The inline calls (`notifyChannexCalendarOverrideChange`, `notifyChannexOverviewCalendarChange`, `syncChannexBookingAvailabilityIfEnabled`, `syncChannexImportedBookingAvailability`) are removed in rollout step 3.

**The table must exist before any write site uses the writer.** The writer runs inside the transactions of PropertyHandler, General-Bookings, UnifiedMessaging and ChannelManagement (the Channex booking poll imports bookings there, `channelManagementHandler.js:104-106`). If the table is missing, those transactions fail, and with them host saves and bookings. The migration is therefore applied in rollout step 1 (D11), and step 3 is not merged until it is confirmed on the `main` schema.

**Shared code in new Lambdas.** PropertyHandler and General-Bookings do not import from `.shared/` today; the writer makes them the first. This works because the deploy copies `.shared` into every Lambda (`.github/workflows/deploy.yml:142-143`), but any change under `.shared/` redeploys all Lambdas (`deploy.yml:75`).

**Conflicts on the write side.** Booking create and cancel, the Channex import and the two global settings paths get a transaction they do not have today, and on Aurora DSQL a transaction can fail at commit with SQLSTATE `40001` when another one touched the same rows. The only retry for that today sits around `acceptInquiryWithOverlapDecline` (`reservationRepository.js:483-492`, three attempts); `markBookingPaidWithOutbox` has none and there is no shared helper. This work therefore adds a small shared retry helper, modelled on that loop, and every write site uses it, so a host save or a booking does not fail on a conflict that a retry would resolve.

**Response change.** After step 3, the `PATCH /property/calendar/overrides` response no longer contains `channexCalendarChangeSync`, because no Channex call happens during the request. No frontend code reads that field (checked in `frontend/web/src` and `frontend/app`).

**Layering.** Working out which dates and change types changed moves from the controller (`collectCalendarOverrideChangeTypes`, `propertyController.js:692`) to the business layer, next to the transaction. `CLAUDE.md` keeps the controller to parsing and authorisation.

## 8. Worker

EventBridge invokes `ChannelManagement` every minute with `{ action: "PROCESS_CHANNEX_ARI_OUTBOX" }`, dispatched in `.shared/channelManagement/handler/channelManagementHandler.js` next to the existing booking poll event.

### 8.1 In short

```
Every minute:
1. FIND      properties with changes that are ready to send
2. For each property, oldest first:
   a. LOCK     make sure no other run is sending for this property
   b. CLAIM    take its waiting rows
   c. MERGE    combine dates that touch
   d. READ     get the current values from the database
   e. SEND     at most one availability call and one restrictions call
   f. RECORD   mark each row with the result
   g. UNLOCK   always, even after an error
3. STOP      starting new properties after about 45 seconds
4. CLEAN UP  delete old rows
```

### 8.2 Each step in detail

Each property is handled in its own `try`, oldest pending row first, so an error on one property never stops the others.

| Step | What happens | Why |
|---|---|---|
| **1. Find** | Properties with `PENDING` rows where the newest is older than 60 seconds (the host has stopped saving) or the oldest is older than 5 minutes. A row from a booking or a Channex import makes the property ready straight away. A property with any row still waiting for `nextAttemptAt` is skipped entirely until that time has passed. `PROCESSING` rows untouched for 5 minutes are from a crashed run and go back to `PENDING` | D3 |
| **2a. Lock** | Find the Channex account and lock `channex_ari:<propertyId>`. Already locked, or a `40001`, means another run has it, so skip this property. No longer linked to Channex means the rows become `SKIPPED` with reason `NOT_MAPPED` | D7, edge case a |
| **2b. Claim** | The property's `PENDING` rows created before this run started, and whose `nextAttemptAt` is empty or passed, become `PROCESSING`, with attempts + 1. Rows that arrive during the run wait for the next run | |
| **2c. Merge** | Per change type, ranges that touch or overlap become one. A `FULL_SYNC` row replaces everything: 500 days, all types | D9, #3282 |
| **2d. Read** | Build the payloads from the current values in the database, once per change type with only that type's dates | D1 |
| **2e. Send** | At most one availability call and one restrictions call, each with an 8 second timeout | D4 |
| **2f. Record** | Mark the claimed rows with the result | See 8.3 |
| **2g. Unlock** | Always release the lock, also after an error. A failing unlock is logged, not thrown | |
| **3. Stop** | Start no new property after about 45 of the 60 seconds. Because the oldest goes first, a property left over waits one run longer | |
| **4. Clean up** | Delete at most 1,000 rows per run: `PROCESSED` and `SKIPPED` older than 30 days, `FAILED` older than 90 days | Edge case c; 1,000 is well under the DSQL limit of 3,000 rows per transaction |

### 8.3 What happens with each result

| Result from Channex | The claimed rows become | And |
|---|---|---|
| Success (2xx) | `PROCESSED` | What was sent is stored in `sentsummary` |
| API key rejected (401, 403) | `FAILED` | The worker stops for this account in this run (edge case b) |
| Other client error (4xx) | `FAILED` | The reason is stored in `failurereason` |
| Too many requests (429), server error (5xx), timeout | `PENDING` | With a `nextAttemptAt`, so they are tried again later (#3280) |
| One call succeeds, the other fails | Handled as the failure | The next run sends both calls again |
| An unexpected error in our own code | `PENDING` | With a `failurereason` and a `nextAttemptAt` (#3280) |

### 8.4 Why it works this way

**One change type per build.** The existing restriction builder applies one set of change types to every date it receives (`channexAvailabilitySyncService.js:122-130`). Passing the union of the claimed rows' types would send, for example, a price for dates where only the minimum stay changed, which breaks D9 and scenario 13. The worker therefore calls the builder once per change type with that type's dates, and combines the results with `combineChannexRestrictionSyncPayloadsForProvider` (`utils/channexAriPayloadUtils.js:1057`), which already merges several groups into one request, so D4 still holds.

**Lock conflicts on DSQL.** The lock is a conditional UPDATE (`integrationSyncRepository.js:61-74`). On Aurora DSQL two runs that update the same lock row at the same time both see success, and the second fails at commit with SQLSTATE `40001` instead of returning zero affected rows. That error means another run holds the lock, so it is handled as "not acquired". The existing booking poll takes its lock before its `try` (`channexBookingPollingService.js:129`, `try` at `:156`), so an error there would end the whole run; the worker does not copy that part. One failing property never stops the others.

**Partial success.** A row can carry several change types, so the availability call can succeed while the restrictions call fails. The claimed rows then follow the failure (for example back to `PENDING` on a 429), and the next run sends both calls again. Resending availability is harmless because the worker reads the current value (D1). Rejected: one row per change type (more rows and harder merging for a rare case) and marking the rows `PROCESSED` (the failed change would be lost).

**A full sync supersedes the changes claimed with it.** When the claimed rows include a `FULL_SYNC` row and the full sync succeeds, every claimed row, including the `CHANGE` rows, is marked `PROCESSED`. The `CHANGE` rows get a `sentsummary` that points to the full sync (`supersededBy: <id of the FULL_SYNC row>`), so they do not run again in the next cycle.

**Why the `finally`.** Without it, an unexpected error (for example while building a payload) would leave the lock held until its 5-minute lease expires, and the property would get no updates in that time. Releasing the lock alone is not enough: the claimed rows would stay `PROCESSING` until stale recovery. The `catch` returns them to `PENDING` straight away.

**Every push has a timeout.** `postChannexPushRequest` only applies a timeout when the caller passes one (`providerClient.js:189-197`), and today only the full sync does, with 8 seconds (`CHANNEX_FULL_SYNC_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS`, `channexAriPayloadUtils.js:19`). The calendar path passes `options?.providerRequestTimeoutMs`, which its callers leave undefined, so a hanging Channex call has nothing to stop it. The worker always passes the same 8 seconds. Without it, one slow call can outlast the 60 second Lambda timeout, and the lock plus the claimed rows stay stuck until the 5 minute stale recovery.

**Cleanup batch size.** Aurora DSQL allows a transaction to change at most 3,000 rows and 10 MiB of data, and to run for at most 5 minutes. None of these is adjustable ([AWS: cluster quotas and database limits](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/CHAP_quotas.html), checked 23 September 2026). Over the limit, the transaction fails with `ERROR: transaction row limit exceeded`. The cleanup therefore deletes at most 1,000 rows per run, well under the limit, and the rest follows in the next runs.

## 9. Infrastructure prerequisites

Checked read-only on 21 September 2026:

| Item | Today | Needed |
|---|---|---|
| The `ChannelManagement` Lambda | Exists and is deployed by the pipeline | Nothing |
| Its permissions | Can read the database settings, connect to the database and use Secrets Manager | Nothing for the worker. Later: limit Secrets Manager to the Channex secrets, read-only |
| Timeout and memory | 10 seconds, 128 MB | About 60 seconds, 256 MB |
| Something that wakes it every minute | Nothing | An EventBridge schedule, plus permission for EventBridge to call the Lambda |
| Environment variables | 5 Channex variables | Nothing new |
| The new table | Does not exist | Apply the migration to the `main` schema |

*Details:* Node.js 22; role `service-role/ChannelManagement-role-uiu6hkwd` with inline policy `ChannelManagementRuntimeAccess` (`ssm:GetParameter` on `/aurora/dsql/*`, `dsql:DbConnectAdmin`, Secrets Manager read and write); no resource policy and no EventBridge rule today; schedule `rate(1 minute)` with the input from section 8; migration in `ChannelManagement/migrations/`.

## 10. Edge cases

| What happens | What the design does |
|---|---|
| a. The property is unlinked from Channex after a row was written | The rows become `SKIPPED` with reason `NOT_MAPPED`; nothing is sent |
| b. Channex rejects the API key (401, 403) | The rows become `FAILED`; the worker stops for that account in this run |
| c. Old rows pile up | Sent and skipped rows are deleted after 30 days, failed rows after 90 days, a small batch at the end of every run (section 8, step 4) |
| d. Someone needs to see what failed | Failed rows per property feed the monitoring dashboard (#2869) |
| e. The worker crashes after sending but before marking the row | The row is sent again. That is harmless: it sends the same current values (D1) |
| f. The worker stops running (broken schedule, broken Lambda) | Rows simply stay `PENDING` and nothing fails, so nobody notices. A CloudWatch alarm on the age of the oldest `PENDING` row catches this. Set up with this work, before the full monitoring of #2869 |

## 11. Testing

**Unit (test-first, every commit):** change detection per save; range merging (D9) including `FULL_SYNC`; rates on one range and restrictions on another produce one restrictions request that sends each field only for its own dates; properties processed oldest pending row first; readiness (D3) including the 5-minute cap, a booking row making a property ready straight away, and a property with a row in back-off being skipped as a whole; the claim skipping rows whose `nextAttemptAt` has not passed; every push carrying the 8 second timeout; one call succeeding and the other failing returns the claimed rows as a failure; at most one call per type per property per run (D4); result classification including `SKIPPED` and the 401/403 stop; lock taken → skip, stale lock → take over, `40001` on the lock → skip, an error on one property still processes the next; a successful `FULL_SYNC` marks the `CHANGE` rows claimed with it as `PROCESSED`; an unexpected error returns the claimed rows to `PENDING` and still releases the lock; cleanup deletes only rows past their retention and no more than one batch per run.

**Transaction tests per write site:** the domain write and the row commit together; a failure writing the row rolls back the domain write (D8); an unmapped property writes no row (D10); a `40001` at commit is retried by the shared helper and succeeds on the second attempt; a booking row covers the nights of the stay, with `dateTo` as the last night and not the checkout date.

**Real systems:**
- Against Aurora DSQL (`test` schema): the conditional claim and the lock behave correctly under optimistic concurrency. Mocked repositories cannot show SQLSTATE `40001` behaviour or wrong query predicates.
- Against Channex staging (single-unit property): scenarios 3, 4, 7 and 8 each produce exactly one call, with the Channex task ids recorded in `sentsummary`.

## 12. What this unlocks for certification

| Channex item | After this design |
|---|---|
| Pre-flight 1: change observed by the integration | yes: the outbox row, written in the save transaction |
| Pre-flight 2: outbox instead of a direct call | yes |
| Pre-flight 3: back-off on 429 | with #3280 |
| Scenarios 3, 4, 7, 8: one call | yes, through D3 and D9 |
| Scenario 12: queue or limiter | yes, D4 |
| Scenario 13: only changes | yes, D1, D2 and D9; full sync limited by #3282 |

## 13. Questions and their answers

1. **Is 60 seconds of quiet with a 5-minute cap acceptable for hosts?** Answered in review: yes for prices and restrictions, no for bookings. D3 now lets bookings and Channex imports skip the quiet period.
2. **Should the Secrets Manager permissions of the `ChannelManagement` role be narrowed as part of this work or separately?** Separately, with an issue created now.
3. **Does this design replace #3149?** Only in part. #3149 also moved about 30 API Gateway routes to `ChannelManagement`; the outbox only removes the two internal sync calls. #3149 itself was closed on 23 September because its branch was three months old and its author had left, and its route migration runbook was kept.
