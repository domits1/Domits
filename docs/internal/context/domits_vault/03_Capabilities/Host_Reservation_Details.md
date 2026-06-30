---
type: project
status: active
project: host-reservation-details
area: feature-context
owner: engineering
created: 2026-06-05
updated: 2026-06-05
confidence: high
source:
  - repo: docs/internal/apis/bookingengine/booking_and_reservation.md
  - repo: frontend/web/src/features/hostdashboard/HostReservationDetails.js
  - repo: frontend/web/src/features/hostdashboard/HostReservations.js
  - repo: frontend/web/src/features/hostdashboard/hostcalen/HostCalendar.jsx
related:
  - [[Domits_Core_Modules]]
  - [[Messaging]]
  - [[Host_Reservation_Details_Repo_Sources]]
---
# Host Reservation Details

- Last synced: 2026-06-05
- Scope: durable host-side reservation drill-down flow for reservation review, inquiry handling, calendar jumping, and receipt export.

## Feature Purpose

- Hosts need a single reservation detail page that consolidates booking, guest, property, and policy context without forcing them back through the list or calendar.
- The page also acts as the operational handoff point for inquiry approval/decline and reservation follow-up actions.

## Current Implementation Baseline

- The route lives at `/hostdashboard/reservations/:id` and is wired from `mainDashboardHost.js`.
- The surface is implemented in `HostReservationDetails.js` with page-scoped translation access through `hostReservationDetailsTranslations.js`.
- The page reuses shared reservation mutation logic from `reservationService.js` for inquiry accept/decline actions instead of maintaining a separate detail-page-only flow.
- Receipt export is handled client-side through `downloadReservationReceiptPdf.js`.

## Key Behaviors

- The page renders its structure first and fills sections progressively, instead of blocking the full screen behind a single loading state.
- Property, guest, contact, and reservation metadata explicitly fall back to `unavailable`-style labels when upstream data is absent.
- Guest avatar rendering prefers a profile image when present and falls back to the guest initial when it is not.
- "View in calendar" deep-links into Host Calendar with enough state for the target listing to open and the calendar cursor to jump to the reservation month.
- Reservation info is intentionally read-only for check-in instructions, house rules, and cancellation policy on this page.
- Inquiry reservations expose prominent accept and decline actions with confirmation failsafes before mutating status.
- Receipt download exports a branded reservation PDF using the currently resolved reservation snapshot.

## Known Constraints

- Calendar deep-linking depends on the navigation state contract staying aligned between `HostReservationDetails.js` and `HostCalendar.jsx`.
- Same-user self-booked test flows can make "Message guest" behavior look inert because sender and recipient identities collapse to the same account.
- Missing guest/property/policy fields are expected in some payloads and should degrade visibly rather than silently disappearing.
- This page is operationally read-only for policy/instructions editing; editing remains elsewhere in host flows.

## Read Next

- Use [[Host_Reservation_Details_Repo_Sources]] for the current implementation map.
