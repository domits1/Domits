# Host Calendar & Pricing Tab

## Description
This document describes the Host Dashboard `calendar-pricing` page.

The page combines:
- calendar visualization (month/year)
- listing pricing management
- availability restrictions management
- per-day override editing
- iCal import/export sync management

## Scope
Primary frontend module:
- `frontend/web/src/features/hostdashboard/hostcalen`

Primary backend modules:
- `backend/functions/PropertyHandler`
- `backend/functions/Ical-retrieve`
- `backend/functions/Ical-sync-scheduler`

## Main host capabilities
1. View monthly or yearly calendar per listing.
2. See date state in one place:
   - available
   - booked
   - blocked by external iCal source
   - manually overridden
3. Configure base pricing:
   - nightly rate
   - weekend rate
   - weekly and monthly discounts
4. Configure availability restrictions:
   - minimum stay
   - maximum stay (`0` means no maximum)
   - advance notice
   - preparation time
   - availability window
5. Select one or multiple dates and apply per-day overrides:
   - toggle availability on/off
   - set nightly price override
6. Manage calendar sync sources:
   - copy Domits export link (Step 1)
   - add external iCal source (Step 2)
   - sync one source
   - sync all sources
   - edit source name/url/provider
   - remove source (with reason + confirmation flow)

## Sidebar modes
The right-side panel has these modes:
- `summary`
- `pricing-settings`
- `availability-settings`
- `calendar-sync`
- `selection` (when dates are selected)

Modal behavior in sync mode:
- add/edit/remove flows use a focus layer with blurred backdrop
- single-source sync status transitions:
  - `idle` -> `pending`/`syncing` -> `success` or `error`
  - success label resets back to idle after a short delay

## API integration used by this tab

### Property API (`PropertyHandler`)
Base URL (frontend constant):
- `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property`

Used endpoints:
- `PATCH /overview`
  - saves overview-linked pricing and availability restrictions
- `GET /calendar/overrides?propertyId=...`
  - loads per-day availability/price overrides
- `PATCH /calendar/overrides`
  - persists per-day availability/price overrides

Auth:
- all requests use host access token in `Authorization` header
- ownership checks are enforced server-side

### iCal import API (`Ical-retrieve`)
Canonical route:
- `POST /default/ical-retrieve`

Legacy compatibility route (still active):
- `POST /default/Ical-retrieve`

Supported actions:
- `RETRIEVE_EXTERNAL`
- `LIST_SOURCES`
- `UPSERT_SOURCE`
- `DELETE_SOURCE`
- `REFRESH_SOURCE`
- `REFRESH_ALL`

Notes:
- frontend is configured to use lowercase route as canonical
- frontend includes temporary fallback candidates while legacy route still exists

### Booking reads (calendar overlays)
The bookings endpoint is injected via env:
- `REACT_APP_HOST_BOOKINGS_ENDPOINT`
or fallback:
- `REACT_APP_BOOKINGS_API_BASE`

The request appends:
- `?readType=hostId`

If this endpoint is missing or wrong for the environment, booking overlays are unavailable but the rest of the tab still works.

## Data model dependencies
Expected schema is `main` in Aurora DSQL.

Required structures used by this page:
- `main.property_pricing.weekendrate`
- `main.property_calendar_override`
- `main.property_ical_source` (including `provider`)

Availability restrictions expected to exist:
- `MinimumStay`
- `MaximumStay`
- `MinimumAdvanceReservation`
- `MaximumAdvanceReservation`
- `PreparationTimeDays`

## Background sync behavior
Two mechanisms keep source state fresh:
1. UI poll:
   - source list refreshes periodically while page is idle
2. Scheduler:
   - `Ical-sync-scheduler` runs on EventBridge (typically `rate(2 minutes)`)
   - refreshes due sources in batches using configured concurrency

Important:
- Scheduler updates DB timestamps.
- UI reflects updates after poll cycle, manual reload, or next explicit sync action.

## iCal export link behavior (Step 1)
The export URL format is:
- `https://icalender.s3.eu-north-1.amazonaws.com/hosts/{hostUserId}/{propertyId}.ics`

What happens when host clicks copy:
1. link is copied to clipboard
2. export refresh is attempted
3. if refresh fails, link is still copied and a warning is shown

## Known compatibility note
`/Ical-retrieve` still exists for compatibility and migration safety.

Current recommendation:
- keep `/ical-retrieve` as canonical
- remove `/Ical-retrieve` only after a stable release window with confirmed zero usage

## Smoke-test checklist
1. Open `calendar-pricing` and select a listing.
2. Save nightly + weekend pricing, reload, verify persistence.
3. Save availability settings, reload, verify persistence.
4. Select dates, toggle availability and set custom price, reload, verify persistence.
5. In sync panel:
   - add source
   - sync one
   - sync all
   - edit source
   - remove source
6. Verify source status and "last synced" behavior updates as expected.


