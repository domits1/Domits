# Stay-date triggers, part 3: stay date changes: engineering review

Branch: `feat/768-stay-date-changes` (stacked on `feat/768-stay-date-scheduling` until part 2 is merged)
Goal: when a host moves the dates of a paid booking, the scheduled stay-date messages move with them (or are cancelled) before they are due, so a guest never gets a message for dates that no longer apply. The consumer (commit 1) and the writer (commit 2) are in one PR on purpose: the writer is never deployed without the consumer. This record has one section per commit.

## Commit 1: consume `BOOKING_DATES_CHANGED` events

Reviewed: the staged diff (`schedulingService.js`, `deliveryRepository.js`, `constants.js`, their tests, this record)

### Decision

```
outbox event ─▶ claim ─▶ by eventType
   ├─ BOOKING_PAID         ─▶ processEvent (as before)                        { scheduled }
   ├─ BOOKING_DATES_CHANGED ─▶ processDatesChanged                             { updated }
   │     list SCHEDULED CHECK_IN / CHECK_OUT deliveries of the booking
   │       ├─ booking missing or not paid ─▶ cancel all "Booking is no longer eligible for this automation."
   │       └─ paid ─▶ per delivery, recompute with the automation's current rule
   │             ├─ same time ─▶ nothing
   │             ├─ new time ahead ─▶ reschedule
   │             ├─ new time passed ─▶ cancel "Stay dates changed and the send time has passed."
   │             └─ rule cannot be calculated ─▶ cancel "Send time could not be calculated."
   └─ any other type       ─▶ marked processed, nothing scheduled              { scheduled: 0 }
```

- Cancel and reschedule are guarded on status `SCHEDULED`. A delivery the worker has just claimed is not touched, and the worker's own re-check from part 2 covers it.
- This closes the gap noted in part 2: a stay moved earlier is rescheduled before the old time, so it can be sent instead of cancelled.
- A delivery whose automation no longer exists is left to the worker, which cancels it.
- A date-change event never reaches `processEvent`, so it can never create a booking-paid delivery.
- The calculation is shared with scheduling (`calculateStaySchedule`), so the two cannot drift.
- Options weighed: handle date changes only in the worker (rejected, a stay moved earlier is always cancelled), recompute from a rule stored on the delivery (rejected, needs a migration), recompute from the automation's current rule when the event arrives (chosen).
- Consequence accepted: an automation edited after scheduling applies its new rule when the stay dates move.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` Deploy window. The consumer lives in `AutomatedMessaging` and the writer in `General-Bookings`, which deploy separately. Until the new consumer is live, the deployed `processOutbox` treats every event as a paid one. The first date change of a booking is harmless (its key equals the original delivery's and is ignored, and the worker re-checks anyway), but a second one inside the window could duplicate a booking-paid message. | 7/10 | Accepted by the author. The PR says: merge, then wait for both Lambdas to finish deploying. |
| `[P3]` `schedulingService.js` (`processOutbox`): a failed date-change event is stored with the reason "Booking-paid event processing failed.", the generic text of the existing code. | 8/10 | Accepted. It is not shown to hosts. |
| `[P3]` `schedulingService.js` (`processDatesChanged`): one automation lookup per delivery. A booking has few stay-date deliveries. | 7/10 | Accepted. |
| `[P3]` A delivery that is claimed by the worker between the list and the update is skipped by the guarded update. | 8/10 | Accepted. The worker re-checks it. |

### Not in scope

- The writer of the event (commit 2) and the API validation (a separate PR).
- Rescheduling deliveries that are already `PROCESSING`.

### What already exists

- `calculateStayScheduledFor`, `createCancelled` and the worker's re-check from parts 1 and 2.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Stay moved earlier | Message at the old, later time | Yes | Rescheduled before the old time | Message at the new time |
| Stay moved to the past | Late message | Yes | Cancelled with a reason | History row with the reason |
| Booking cancelled | Message to a cancelled guest | Yes | All scheduled stay deliveries cancelled | Cancelled |
| Lookup throws | Event lost | Yes | Event marked failed and retried (max 3) | Nothing |
| Unknown event type | Misread as a paid event | Yes | Marked processed, nothing scheduled | Nothing |

### Verification

New tests were red first (20 failing). `functions/AutomatedMessaging`: 15 suites, 181 tests passed. Full backend run: 463 suites and 6733 tests passed; the same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.

## Commit 2: write `BOOKING_DATES_CHANGED` when a paid booking's dates change

Reviewed: the staged diff (`reservationRepository.js`, `bookingService.js`, their tests, this record)

### Decision

```
host changes the dates of a booking
   bookingService.modifyBookingDates ─ was the booking Paid? ─▶ { notifyAutomations }
        │
        ▼
   reservationRepository.updateBookingDates ── one transaction ──┐
        ├─ UPDATE booking (arrival, departure)                    │ commit, or roll back together
        ├─ Channex availability rows (as before)                  │
        └─ if notifyAutomations: INSERT outbox BOOKING_DATES_CHANGED
              version = MAX(version of this booking and type) + 1 ┘
```

- The event is written in the same transaction as the date update, so a date change never exists without its event, and a failed event write fails and rolls back the date change. The insert is not `orIgnore`: a swallowed conflict would lose the event.
- The version is a per-booking counter, because `eventversion` is a 32-bit integer. Two concurrent changes read the same maximum; the second commit conflicts and `withDsqlRetry` runs the transaction again, which reads the counter again. The existing unique index on booking, type and version is the last line of defence.
- The event is only written when the booking was `Paid` before the change. An unpaid booking has no automation deliveries, and its payment event reads the dates that are current when it is processed.
- Without the flag, and without Channex rows, the write runs exactly as before, with no transaction.
- Consequence accepted: the paid check uses the status read before the transaction.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `reservationRepository.js` (`#enqueueBookingDatesChanged`): the counter relies on DSQL turning two concurrent writers into a commit conflict. I could not check that against a real cluster. If it does not, the unique index raises `23505`, the transaction rolls back and the host gets an error; nothing is stored half-done. | 6/10 | Accepted. Fails safe. |
| `[P3]` `bookingService.js` (`isPaidBookingStatus`): a booking that becomes paid between the status read and the write gets no event. Its payment event reads the current dates when it is processed. | 7/10 | Accepted. |
| `[P2]` Deploy window of commit 1 applies here too: this PR changes two Lambdas. | 7/10 | Accepted by the author. The PR body says to merge, then wait for both Lambdas to finish deploying. |

### Not in scope

- The API validation for the new triggers, which moved to its own PR to keep this one under 1000 lines. Until it is merged, no stay-date automation can be saved, so the event finds no delivery to change.
- Other ways the dates can change, for example a Channex booking revision.

### What already exists

- `#saveWithOutbox` and `withDsqlRetry`, extended instead of adding a second transaction helper.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Event write fails | Dates saved, event lost | Yes | Same transaction: the date change fails | An error, dates unchanged |
| Two changes at once | Same version twice | Yes (retry); the conflict itself is not testable here | Commit conflict, retry re-reads the counter | Both changes saved |
| Unpaid booking | Needless events | Yes | No flag, no transaction | Nothing |
| Writer deployed before the consumer | Event misread as a paid one | No (deploy order) | Accepted window, merge note | See commit 1 |

### Verification

New tests were red first (13 failing). `reservationRepository.datesChanged.test.js`: one transaction for dates and event, version counting (also as text), no `orIgnore`, no transaction without the flag, Channex rows together with the event, a failing write failing the save, and a conflict that re-runs the transaction and re-reads the counter. `bookingService.channex.test.js`: the existing arguments assertion now includes the flag, and the flag is only true for a paid booking, in any capitalisation. Full backend run: 464 suites and 6749 tests passed; the same three suites fail locally for reasons unrelated to bookings: two need AWS credentials and one needs a live database.

## Commit 3: share the scheduling test setup

Reviewed: the staged diff (`stayScheduleFixtures.js`, `schedulingService.test.js`, `schedulingService.datesChanged.test.js`, this record)

### Decision

```
schedulingService.test.js ──────┐
                                ├─▶ stayScheduleFixtures.js  NOW, PAID_BOOKING, CHECK_IN_ROW,
schedulingService.datesChanged ─┘                            buildSchedulingService({ booking, checkIn, repositories })
```

- Sonar's quality gate failed on duplication (4.1%, limit 3%): the booking constants and the service construction with its booking-context fake were copied between the two test files.
- The shared parts moved into one helper. What each test checks is unchanged: same tests, same assertions, same count.
- The delivery, outbox and automation fakes stay in their own files, because they differ per suite.
- Three Sonar S9382 findings (`await` inside a loop, `schedulingService.js` lines 88, 95 and 144) are left as they are. The loops are sequential on purpose, one database update at a time, and a parallel version would change the failure behaviour.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `stayScheduleFixtures.js`: uses the global `jest` in a non-test module. Jest injects it into every module it loads. | 8/10 | Accepted. |
| `[P3]` The repository fakes are still similar between the two suites, so Sonar may report a smaller remaining duplication. | 7/10 | Accepted. Check the next Sonar run. |

### Not in scope

- Changing the sequential loops flagged by S9382.
- Any production code.

### What already exists

- The two suites' own setups, reduced to what differs.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Shared fixture changed for one suite | The other suite checks the wrong thing | Both suites run the same assertions | The helper holds only constants and the service wiring | Nothing |

### Verification

No new behaviour, so no red step. `functions/AutomatedMessaging`: 15 suites, 181 tests passed, the same count as before the change.

## Commit 4: remove the remaining duplicated setup in the dates-changed tests

Reviewed: the staged diff (`schedulingService.datesChanged.test.js`, this record)

### Decision

```
schedulingService.datesChanged.test.js
   singleStaySetup(arrival?)  one paid booking, one CHECK_IN delivery, one CHECK_IN rule
   expectUntouched(repo)      neither cancelScheduled nor rescheduleScheduled was called
```

- Sonar's duplication gate still failed (3.9%, limit 3%) after commit 3. The remaining duplicated lines were the same booking, delivery and rule setup, and the same pair of "not called" assertions, repeated across the cases of one file.
- The setup moved into `singleStaySetup`, which takes the new arrival date or none, and the repeated assertions into `expectUntouched`. Every case and every assertion is kept: same tests, same count.
- The helpers stay in the file, because only this suite uses them.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `singleStaySetup()` without an argument uses the unchanged booking, which is what the "time is unchanged" test used before. | 8/10 | Accepted. |
| `[P3]` `expectUntouched` asserts inside a helper, so a failure points at the helper line. Jest still names the failing test. | 7/10 | Accepted. |

### Not in scope

- The S9382 findings (`await` inside sequential loops) and any production code.

### What already exists

- `stayScheduleFixtures.js` from commit 3, unchanged.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Helper hides a changed assertion | A case stops checking what it did | Same cases, same assertions, same count | The helper holds exactly the two assertions it replaced | Nothing |

### Verification

No new behaviour, so no red step. `functions/AutomatedMessaging`: 15 suites, 181 tests passed, the same count as before the change.
