---
type: source
status: active
project: host-reservation-details
area: repo-doc-import
owner: engineering
created: 2026-06-05
updated: 2026-06-05
confidence: high
source:
  - repo: docs/internal/apis/bookingengine/booking_and_reservation.md
  - repo: frontend/web/src/features/hostdashboard/HostReservationDetails.js
  - repo: frontend/web/src/features/hostdashboard/HostReservationDetails.module.css
  - repo: frontend/web/src/features/hostdashboard/HostReservations.js
  - repo: frontend/web/src/features/hostdashboard/hostcalen/HostCalendar.jsx
  - repo: frontend/web/src/features/hostdashboard/services/downloadReservationReceiptPdf.js
  - repo: frontend/web/src/features/hostdashboard/services/reservationService.js
  - repo: frontend/web/src/features/hostdashboard/translations/hostReservationDetailsTranslations.js
related:
  - [[Host_Reservation_Details]]
---
# Host Reservation Details Repo Sources

- Last synced: 2026-06-05
- Scope: curated repo map for durable host reservation details behavior.

## Primary Source Docs And Code

- `docs/internal/apis/bookingengine/booking_and_reservation.md`
  - broader booking and reservation domain context
- `frontend/web/src/features/hostdashboard/HostReservationDetails.js`
  - main host reservation detail page, section loaders, fallbacks, inquiry actions, message/calendar navigation, and receipt trigger
- `frontend/web/src/features/hostdashboard/HostReservationDetails.module.css`
  - reservation detail layout, action card, confirmation modal, and loading-state styling
- `frontend/web/src/features/hostdashboard/HostReservations.js`
  - reservation list entry point and shared inquiry status update flow
- `frontend/web/src/features/hostdashboard/hostcalen/HostCalendar.jsx`
  - selected-listing resolution and calendar focus-date handling for "View in calendar"
- `frontend/web/src/features/hostdashboard/services/downloadReservationReceiptPdf.js`
  - branded reservation receipt generation and filename normalization
- `frontend/web/src/features/hostdashboard/services/reservationService.js`
  - accept/decline inquiry mutation path reused by list and details views
- `frontend/web/src/features/hostdashboard/translations/hostReservationDetailsTranslations.js`
  - page-scoped reservation detail UI copy sourced from shared language bundles

## Source-Of-Truth Rule

- Use `HostReservationDetails.js` as the primary frontend source of truth for current user-visible behavior.
- Use `HostCalendar.jsx` when validating whether reservation-to-calendar navigation still opens the correct listing and month.
- Use `downloadReservationReceiptPdf.js` when changing receipt structure, naming, or branding.

## Durable Caveats

- The page mixes reservation payload data with separately resolved property and guest profile data, so regressions can come from any of those fetch paths.
- Translation scope is page-specific through the accessor module, but the underlying text still lives in shared language JSON files.
