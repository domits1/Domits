# Stay-date triggers, part 2: scheduling and send-time safety: engineering review

Branch: `feat/768-stay-date-scheduling` (stacked on `feat/768-stay-date-triggers` until PR 1 is merged)
Goal: automations anchored to check-in or check-out are scheduled from the booking dates, and are re-checked before they are sent, so a guest never gets a message at the wrong time. The consumer of the date-change event moved to part 3, together with the code that writes the event, so the writer is never deployed without it. This record has one section per commit.

## Commit 1: schedule check-in and check-out automations

Reviewed: the staged diff (`schedulingService.js`, `deliveryRepository.js`, `automationRepository.js`, their tests, this record)

### Decision

```
BOOKING_PAID event ─▶ booking paid? ─▶ active automations of the host and property (any trigger)
                                          ├─ BOOKING_PAID        ─▶ event time + offset        (as before)
                                          ├─ CHECK_IN / CHECK_OUT ─▶ scheduleCalculator
                                          │      ├─ time ahead    ─▶ SCHEDULED delivery
                                          │      ├─ time passed   ─▶ CANCELLED "Send time had already passed when the booking was paid."
                                          │      └─ cannot compute ─▶ CANCELLED "Send time could not be calculated."
```

- `listActiveForBooking` no longer filters on `BOOKING_PAID`.
- The idempotency key is `{automation}:{booking}:{trigger}:{version}`. For `BOOKING_PAID`, and for rows without a trigger, it is exactly the old key, and `eventType` stays `BOOKING_PAID`.
- A past time is recorded as a `CANCELLED` delivery with a reason, so the host sees it in the history, and it is never sent late. A rule the calculator cannot handle cancels only that automation; the other automations and the event carry on.
- The property's check-in row is loaded once, and only when a stay-date automation exists.
- Nothing creates a stay-date automation yet (the API change is in part 3), so this commit does not change behaviour in production.
- Options weighed for a past time: send immediately (rejected, the message would no longer fit), no row at all (rejected, the host could not see why), a cancelled row with a reason (chosen).
- Consequence accepted: a new stay-date automation only applies to bookings paid after it is activated.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `schedulingService.js` (`processOutbox`): `scheduled` now counts every delivery recorded, including cancelled ones. | 8/10 | Accepted. It is a log figure only. |
| `[P3]` `schedulingService.js` (`scheduleStayDelivery`): the calculator error is not logged. The reason stored on the delivery is the signal, and the error text could carry booking data. | 6/10 | Accepted. |
| `[P3]` A stay delivery is scheduled with the automation's rule at the time of payment. Editing the automation later does not change deliveries that already exist, as before. | 8/10 | Accepted. |

### Not in scope

- The worker re-check before sending, and the date-change event (next commits and part 3).
- Applying a new automation to bookings that were paid earlier.

### What already exists

- `calculateStayScheduledFor` from part 1, `createScheduled` and the idempotent insert, reused.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Send time already passed at payment | Late message | Yes | Cancelled delivery with a reason | History row "CANCELLED" with the reason |
| Stored rule the calculator rejects | One bad automation fails the event | Yes | That automation cancelled, the rest scheduled | History row with the reason |
| Event processed twice | Duplicate delivery | Yes | Idempotency key | One delivery |
| Property without check-in row | No time to anchor to | Yes | Fallback 15:00 and 11:00 | A message at the fallback time |

### Verification

New tests were red first (10 failing). `functions/AutomatedMessaging`: 14 suites, 148 tests passed. Full backend run: 457 suites and 6548 tests passed; the same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.

## Commit 2: re-check the schedule before sending

Reviewed: the staged diff (`deliveryWorker.js`, `deliveryRepository.js`, `constants.js`, their tests, this record)

### Decision

```
claimed stay delivery ─▶ paid and in scope? ─▶ recompute scheduledFor from the current booking
      ├─ same time ─▶ more than 6 h late? ─ yes ─▶ CANCELLED "Send time has passed."
      │                                    └ no ──▶ authorizeSend(dates it used) ─▶ send
      ├─ changed, new time ahead ─▶ back to SCHEDULED with the new time (RESCHEDULED)
      └─ changed, new time passed ─▶ CANCELLED "Stay dates changed and the send time has passed."
```

- `authorizeSend` now also requires the booking's arrival and departure to equal the values the worker used, for every trigger, because the rendered text contains the dates. Dates that move between the check and the send cancel the delivery.
- `reschedule` is guarded on status `PROCESSING`, so it cannot touch a delivery that something else already changed.
- The 6-hour grace (`STAY_SEND_GRACE_MS`) covers a worker outage. A booking-paid delivery keeps its old behaviour and is never held to it.
- The schedule is recomputed with the automation's current rule, because a delivery stores no rule and a new column would need another migration.
- Options weighed: store the rule on the delivery (rejected, needs a migration), recompute from the current rule (chosen).
- Consequence accepted: when a host edits an automation and the stay dates move afterwards, the new rule applies.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `deliveryWorker.js` (`verifyStaySchedule`): the worker only meets a delivery at its old time. A stay moved earlier is always behind by then, so the message is cancelled, not sent. | 9/10 | Accepted for this part. Part 3 adds the date-change event that reschedules before the old time. |
| `[P3]` `deliveryWorker.js`: the result of `reschedule` is not read. If the delivery stopped being `PROCESSING` at that moment, the worker still reports `RESCHEDULED`. | 6/10 | Accepted. The claim is exclusive and the report is a log value. |
| `[P3]` `deliveryRepository.js` (`authorizeSend`): dates that change between the check and the send cancel the delivery instead of rescheduling it. | 8/10 | Accepted. Narrow race. |

### Not in scope

- The date-change event, its consumer and writer, and the API (part 3).

### What already exists

- `claim`, `markCancelled` and the `authorizeSend` transaction guard, extended, not rebuilt.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Stay moved later | Message at the old time | Yes | Rescheduled | Message at the new time |
| Stay moved earlier, old time reached | Late or wrong message | Yes | Cancelled with a reason | History row with the reason |
| Dates move between check and send | Text with old dates | Yes | `authorizeSend` refuses | Cancelled |
| Worker down for a day | Late message | Yes | Cancelled after 6 hours | History row "Send time has passed." |
| Booking cancelled | Message to a cancelled guest | Yes | Cancelled (existing check) | Cancelled |

### Verification

New tests were red first (16 failing, including worker tests that now require the dates in `authorizeSend`). `functions/AutomatedMessaging`: 14 suites, 160 tests passed. Full backend run: 457 suites and 6560 tests passed; the same three suites fail locally for reasons unrelated to messaging.

