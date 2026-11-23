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
