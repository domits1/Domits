# Stay-date triggers, part 4: API and editor: engineering review

Branch: `feat/768-stay-date-editor` (stacked on `feat/768-stay-date-changes` until #4014 is merged)
Goal: a host can create, edit and preview check-in and check-out automations. The API validates them with the same rules as the scheduler, and the editor shows what will be sent in one plain sentence. This record has one section per commit.

## Commit 1: validate the stay-date trigger, direction and send time

Reviewed: the staged diff (`automationService.js`, `constants.js`, `README.md`, `automationService.schedule.test.js`, this record)

### Decision

```
create / update / activate ─▶ normalizeDefinition ─▶ normalizeSchedule(trigger, offset, direction, sendTime)
   trigger in BOOKING_PAID | CHECK_IN | CHECK_OUT
   ├─ BOOKING_PAID ─▶ direction empty or AFTER (stored NULL), BEFORE rejected, sendTime rejected
   └─ CHECK_IN / CHECK_OUT ─▶ direction BEFORE or AFTER required
                              sendTime HH:MM, optional, needs DAYS or amount 0 (the calculator's rule)
```

- One helper is shared by create, update and activate, so a rule the scheduler cannot calculate cannot be saved or activated.
- Old automations carry no direction and no send time. They read back as `null` and pass validation unchanged.
- An amount of 0 is stored with the unit `MINUTES` (as before), so a send time with "no offset" passes.
- The DTO returns `offsetDirection` and `sendTime`.
- A partial normalisation (not used by any caller today) only validates the schedule when a schedule field is present, and no longer forces the trigger to `BOOKING_PAID`.
- Options weighed for the send-time check: call the calculator with a sample booking (rejected, couples validation to a calculation), repeat its one rule in the service (chosen, covered by tests).
- Consequence accepted: the HH:MM pattern also exists in the calculator.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P2]` `automationService.js` (`normalizeSchedule`): the API now accepts stay triggers, so the feature is usable once this is deployed. It needs the consumer and writer of #4014 deployed first. | 8/10 | Accepted. This branch stacks on #4014 and the PR says so. |
| `[P3]` `constants.js` (`SEND_TIME_PATTERN`) repeats the regex in `scheduleCalculator.js`. | 7/10 | Accepted. Left out to keep refactoring in its own commit. |
| `[P3]` `normalizeDefinition`: the message for an unknown trigger changed from "Only the BOOKING_PAID trigger is supported." to "Unsupported triggerType." Nothing depended on the old text. | 8/10 | Accepted. |
| `[P3]` `update` merges the stored rule with the patch, so a patch that switches to hours without clearing `sendTime` gets a 400. | 7/10 | Accepted. Tested, fails safe. |

### Not in scope

- The preview schedule (next commit) and the editor.
- Rejecting a rule that is valid but already in the past for every booking.

### What already exists

- `normalizeOffset`, `validateTemplate` and the calculator's rules, reused.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Hours offset with a send time | Scheduler throws, delivery cancelled | Yes | Rejected on save | 400 with a reason |
| Stay trigger without direction | Silent "after" | Yes | Rejected on save | 400 with a reason |
| Booking-paid with BEFORE or a time | Rule that can never apply | Yes | Rejected on save | 400 with a reason |
| Automation saved before the fields existed | Old rows fail to load or activate | Yes | `null` fields accepted | Nothing |
| Stored rule broken, then activated | Active automation that cannot schedule | Yes | Activation validates the stored rule | 400 |

### Verification

New tests were red first (16 failing). A mutation check (dropping the unit rule, the BEFORE rule and the send-time rule) made 4 tests fail and the file was restored. `functions/AutomatedMessaging`: 16 suites, 212 tests passed. Full backend run: 477 suites and 6898 tests passed; the same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.

## Commit 2: preview when a stay-date message would be sent

Reviewed: the staged diff (`automationService.js`, `automationService.preview.test.js`, this record)

### Decision

```
preview(input, automationId?) ─ bookingId given? ─ no ─▶ schedule: null
                                   │ yes
                                   ▼
        rule = stored automation fields, overridden by the request fields
        stay trigger? ─ no ─▶ schedule: null     (booking-paid is not validated, as before)
                         yes ▶ normalizeSchedule(rule) ▶ calculateStayScheduledFor(booking, property check-in times)
                                  ▶ { scheduledFor, isPast, timeZone: "Europe/Amsterdam" }
```

- The preview uses the booking context it already loads, so it adds no query.
- The same normalisation and calculator as saving and scheduling are used, so the preview cannot show a time the scheduler would not use.
- A rule the scheduler cannot calculate fails the preview with a 400 and a reason, the same as saving it.
- Options weighed: calculate the time in the editor (rejected, a second copy of the DST rules), return it from the preview (chosen).

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `buildPreviewSchedule` reads `Date.now()` directly, so tests spy on it. | 8/10 | Accepted. |
| `[P3]` `isStayTrigger` repeats the helper in `schedulingService.js`. They live in different modules. | 7/10 | Accepted. |
| `[P3]` A stay rule that cannot be calculated now returns 400 from the preview when a booking is given. | 8/10 | Accepted. Same as save. |

### Not in scope

- Showing the schedule in the editor (next commit).
- A preview without a booking, which has no dates to calculate from.

### What already exists

- `getBookingContext`, `calculateStayScheduledFor` and `normalizeSchedule`, reused.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Preview of a rule the scheduler rejects | A time that would never be used | Yes | 400 with a reason | Error message |
| Booking-paid preview with leftover stay fields | A preview that used to work fails | Yes | Not validated, schedule null | Preview as before |
| Property without check-in times | No time to anchor to | Covered by the calculator tests | Fallback 15:00 and 11:00 | A time at the fallback |
| Send time already passed | A time that cannot be sent | Yes | `isPast: true` | The editor can say so |

### Verification

New tests were red first (7 failing, then one more for the booking-paid case). `functions/AutomatedMessaging`: 16 suites, 220 tests passed. Full backend run: 477 suites and 6906 tests passed; the same three suites fail locally for reasons unrelated to messaging.

## Commit 3: choose when to send in the editor

Reviewed: the staged diff (`AutomationsPage.jsx`, `scheduleOptions.js`, `automations.scss`, their tests, this record)

### Decision

```
When to send (6 options)          stored rule
  Booking paid               ─▶  BOOKING_PAID, no direction
  Before check-in            ─▶  CHECK_IN,  BEFORE
  On check-in day            ─▶  CHECK_IN,  AFTER, amount 0 (amount fixed)
  After check-in             ─▶  CHECK_IN,  AFTER, amount > 0
  Before check-out           ─▶  CHECK_OUT, BEFORE
  After check-out            ─▶  CHECK_OUT, AFTER
+ amount, unit, optional time of day (days, or on the day itself)
+ one sentence: "3 days before check-in, at 10:00 (Amsterdam time)"
+ note for stay rules: "Applies to bookings paid after you activate it"
```

- `scheduleOptions.js` is pure: it maps a stored rule to an option and back, builds the payload, and writes the sentence. The page only holds state.
- Every rule the API allows maps to an option and back to the same trigger and direction (tested over all combinations). An old automation without the new fields loads as Booking paid and saves as Booking paid, with a null direction and a null time.
- The time of day is disabled, with the reason shown, when the unit is hours or minutes, and it is not sent in that case. The API enforces the same rule.
- The Channel select moved next to the property select so the scheduling row holds amount, unit and time of day. The Trigger select is replaced by the picker.
- Options weighed for "After check-in": a seventh special case in the page (rejected), a sixth option next to the others so no stored rule is unrepresentable (chosen, at the host's request).
- Consequence accepted: the sentence logic repeats the time-of-day rule of the API.

### Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `scheduleOptions.js` (`canPickTimeOfDay`) is the third copy of "a time of day needs days or amount 0". | 8/10 | Accepted. The API stays the authority and answers 400. |
| `[P3]` The preview schedule from the API is not shown: the page has no booking picker, so it never sends a booking. | 8/10 | Accepted. |
| `[P3]` `changeScheduleOption`: leaving "On check-in day" keeps amount 0, except "After check-in", which starts at 1. Before and After check-out with 0 are valid and read "On the day of ...". | 7/10 | Accepted. |
| `[P3]` One snapshot test in the website feature (`panoramaElitePagesPin`) fails in the full web run. It does not import anything in this diff; not run on a clean branch. | 9/10 | Reported, not fixed here. |

### Not in scope

- A booking picker in the editor, which would show the planned time from the preview.
- Applying a new automation to bookings that were paid earlier.

### What already exists

- The page's sections, fields and styles, and the API validation of commit 1, reused.

### Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Time of day with hours | API refuses the rule | Yes | Field disabled with a reason, not sent | Hint text |
| Old automation without the fields | Loads as the wrong option | Yes | Reads as Booking paid | Same as before |
| Stored rule with no matching option | Rule changed silently on save | Yes (all combinations) | Six options cover every allowed rule | The right option |
| Backend not yet deployed | Saving a stay rule fails | No (deploy order) | API answers 400 | Error message |

### Verification

New tests were red first (the helper module did not exist, and 8 page tests failed). `scheduleOptions.test.js`: 30 tests. The hostmessages suites: 12 suites, 181 tests passed. Full web run: 299 suites passed; the one failing suite is the unrelated snapshot above.
