# More variables for automated messages, backend: engineering review

Branch: `feat/768-automation-variables` (from `origin/acceptance`)
Reviewed: the staged diff for the backend commit (`AutomatedMessaging` and the shared ORM table list)
Goal: hosts can use `{{checkInTime}}`, `{{checkOutTime}}`, `{{propertyAddress}}`, `{{propertyCity}}` and `{{numberOfGuests}}` in automated message templates, next to the four that exist.

## Decision

```
booking ──┬─▶ property (title)                      ─▶ propertyName
          ├─▶ property_checkin (checkinfrom, checkouttill)  ─▶ checkInTime, checkOutTime
          ├─▶ property_location (street, number, postal code, city) ─▶ propertyAddress, propertyCity
          └─▶ booking.guests                         ─▶ numberOfGuests
                         │
         buildBookingVariables ─▶ renderTemplate ─┬─ preview: marker policy, shows [Missing: x]
                                                   └─ worker: error policy, delivery FAILED, nothing sent
```

Decided with the author:
- **A missing value skips the message.** The worker already renders with the `error` policy, so a missing value throws and `processDue` marks the delivery FAILED. That stays. The reason now names the variables, for example `Missing values: checkInTime`, instead of the generic "Approved template values are missing." The names are filtered against `APPROVED_VARIABLES`, so a failure reason can only ever contain approved variable names, never guest or property data. Nothing is sent and `authorizeSend` is not reached.
- **Times.** `checkInTime` is the start of the check-in window (`checkinfrom`) and `checkOutTime` is the end of the check-out window (`checkouttill`). They are shown as `HH:MM`.
- **Address.** `propertyAddress` is street, house number with its extension, and the postal code: `Keizersgracht 12A, 1015 CJ`. The city is a separate variable so a template does not repeat it. Without a street the address is empty. Without a postal code it is the street line only.
- **Guests.** `numberOfGuests` is `booking.guests` when it is a positive whole number; anything else is empty.

Other changes:
- `getBookingContext` now returns `{ booking, property, checkIn, location }`. The three lookups that depend on the booking's property run with `Promise.all`, so the latency stays at about one extra round trip.
- `Property_Check_In` and `Property_Location` are registered in `.shared/.../Tables.js`. That list is shared by every Lambda on the shared ORM, but `synchronize` is `false` (`ORM/index.js:63`), so it only adds metadata. `backend/ORM/util/database/Tables.js` already had both.
- `SAFE_PREVIEW_VALUES` has a sample for each new variable, so a preview without a booking shows no `[Missing: …]`.
- Existing deliveries keep their stored `templateSnapshot`, which only contains the four old variables, so no data migration is needed.
- Options weighed for a missing value: render an empty string (the guest could get "Check-in from ." and the host would never know), or skip with a named reason (chosen).
- Consequence accepted: until the host fills in the property data, that delivery fails and the guest gets no message. There is no manual resend today.

## Findings

| Finding | Confidence | Resolution |
|---|---|---|
| `[P3]` `deliveryWorker.js` (`missingValuesReason`): a failure reason now depends on `error.details.missingVariables`, which `templateRenderer.js:78` sets. A different shape of error falls back to the generic reason. | 9/10 | Accepted; covered by the unsupported-variable test. |
| `[P3]` `automationService.js` (`formatAddress`): the house number and its extension are joined without a separator (`12A`). An extension such as `II` or `bis` would read `12II`. | 6/10 | Accepted. It matches how the extension is stored. |
| `[P3]` Rolling the backend back after hosts saved templates with the new names: those snapshots fail validation in the worker and show the generic reason. | 7/10 | Accepted. Safe, only the reason is vague. |
| `[P3]` `Tables.js` is shared: two more entities for every Lambda on the shared ORM. | 8/10 | Accepted. `synchronize` is `false`. |
| The address is shared with the guest only for a paid booking of the host's own property: the worker checks both before it renders (`deliveryWorker.js:37-48`), and the preview checks ownership. | n/a | No new exposure. |
| `failurereason` is a `TEXT` column, so the longer reason fits. | n/a | Checked in the migration and the model. |

## Not in scope

- The frontend list of variables: next commit.
- Time zones, and Channex or OTA bookings.
- Warning a host that a property lacks check-in or location data.
- A manual resend of a failed delivery.
- The quick-reply templates in `store/templates.js`, which use other placeholders.

## What already exists

- The `missingPolicy` split (`marker` for preview, `error` for delivery) and `missingVariables` in `renderTemplate`.
- `safeFailureReason` and `markFailed` in the worker.
- Both ORM models in `backend/ORM/models`.

## Failure modes

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| Property has no check-in row | Half a sentence is sent | Yes | Delivery FAILED, nothing sent | Host: "Missing values: checkInTime, checkOutTime" |
| Property has no location | Same | Yes | Same | "Missing values: propertyAddress, propertyCity" |
| Booking without a valid guest count | Same | Yes | Same | "Missing values: numberOfGuests" |
| Template that does not use the missing value | Message blocked for nothing | Yes | Sent | The message |
| Unsupported variable in a stored template | Wrong reason | Yes | Generic reason | "Approved template values are missing." |
| Preview of a booking whose property lacks data | Preview fails | Yes | Marker policy shows `[Missing: x]` | Marker in the preview |
| A lookup throws | Worker crashes | Existing | `processDue` catches and marks FAILED | "Automated message delivery failed." |

## Verification

New tests were red first (41 failing before the change). `functions/AutomatedMessaging`: 11 suites, 86 tests passed. Full backend run: 435 suites and 6173 tests passed. The same three suites fail locally for reasons unrelated to messaging: two need AWS credentials and one needs a live database.
