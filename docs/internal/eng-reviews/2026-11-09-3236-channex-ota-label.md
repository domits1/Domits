# feat(messages): show Booking.com or Airbnb instead of CHANNEX on Channex conversations (#3236)

Pull request: opened from `feat/3236-channex-ota-label-v2`
Issue: #3236
Reviewed commit: `7149fdee6`
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `bookingRepository.js:65` | `findGuestNamesForHostBookings` now returns `{ guestName, bookingSource }`, so its name only covers half of what it returns. | Accepted: its one caller, `messageService.js:678`, reads the new shape. The rename can follow |
| P3 (6/10) | `otaDisplayName.js:1` | Only `BookingCom` maps to a display name; any other OTA code shows as Channex sends it. | Accepted: the real codes Channex sends for other OTAs are not known yet. Add them when they are seen |
| P3 (5/10) | `ContactList.jsx:168` | A brand-new conversation that arrives live shows "Channex" until the inbox reloads, because the push carries no booking source. | Accepted: the label corrects itself on the next contacts load |

## What already exists

- The booking source was already stored on imported Channex bookings as `booking_source`, and the guest name lookup already reads these bookings in chunks of 100 per host.
- `HostReservationDetails.js` already mapped `BookingCom` to "Booking.com"; that map moved to `utils/otaDisplayName.js`, so the inbox and the reservation page share it.

## Failure modes

| Path | Failure | Test | Handling | What the host sees |
|---|---|---|---|---|
| Booking lookup | no booking or no source | yes | falls back to "Channex" | the old label |
| Unknown OTA code | a code not in the map | yes | shows the code as sent | the raw code, readable but not branded |
| Domits conversation | platform DOMITS | yes | no badge | no change |

## Not in scope

- Mapping more OTA codes: needs the real values Channex sends.
- Renaming the guest name lookup to booking details.
