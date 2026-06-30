---
type: concept
status: active
area: platform-modules
owner: engineering
created: 2026-05-31
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/apis/propertyhandler/property_handler.md
  - repo: docs/internal/apis/bookingengine/booking_and_reservation.md
  - repo: docs/internal/apis/calendar/host_guest_calendar_workflow.md
  - repo: docs/internal/apis/finance/hostFinance.md
  - repo: docs/internal/apis/revenuemanagement/rates.md
  - repo: docs/internal/apis/messaging/messaging_overview.md
  - repo: docs/internal/apis/messaging/unified_messaging_layer.md
  - repo: docs/internal/apis/messaging/messaging_backend.md
  - repo: docs/internal/apis/messaging/messaging_frontend.md
  - repo: docs/internal/apis/messaging/messaging_runbook.md
  - repo: docs/internal/apis/messaging/messaging_testing.md
  - repo: docs/partner/overview.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_design_pack.md
related:
  - [[Domits_Business_Context]]
  - [[Messaging]]
  - [[Direct_Booking_Website]]
---
# Domits Core Modules

- Last synced: 2026-06-03
- Scope: stable module map for the product and platform surfaces that repeatedly show up in the repo and docs.

## Cross-Module Rule

- PMS-aligned operational data stays upstream.
- Downstream surfaces such as direct booking, messaging, finance, analytics, and partner integrations should consume or extend shared truth instead of inventing isolated models where avoidable.

## Core Modules

### Property Management System

- Owns property creation, listing detail reads, amenities, rules, media, and host ownership context.
- Repo docs highlight role-based host access plus owner-based checks for sensitive operations.
- Primary source: `docs/internal/apis/propertyhandler/property_handler.md`

### Booking and Reservation

- Owns booking creation, booking retrieval, lifecycle changes, and guest payment coordination.
- Sits close to payment intent creation, booking notifications, and property availability effects.
- Primary source: `docs/internal/apis/bookingengine/booking_and_reservation.md`

### Calendar and Availability

- Owns host-facing calendar visualization, pricing, restrictions, per-day overrides, and iCal import/export sync.
- Other product surfaces depend on this domain for availability snapshot behavior and sync metadata.
- Primary source: `docs/internal/apis/calendar/host_guest_calendar_workflow.md`

### Messaging

- Provides realtime guest-host communication via WebSocket plus HTTP history reads.
- Automated booking-triggered messages use the same message-delivery surface.
- The current implementation already has a more explicit unified-layer contract, shared web/mobile payload shapes, and operational runbook/testing material.
- See [[Messaging]] for the durable feature note and source map.
- Primary source: `docs/internal/apis/messaging/messaging_overview.md`

### Finance and Payouts

- Covers Stripe Connect onboarding, host balance, charges, payouts, and payout schedules.
- Depends on valid host identity, Stripe linkage, and booking/payment records.
- Primary source: `docs/internal/apis/finance/hostFinance.md`

### Revenue and KPI Metrics

- Derives host metrics such as revenue, occupancy, ADR, RevPAR, property count, and average stay length.
- Combines booking, property, and Stripe transfer data.
- Primary source: `docs/internal/apis/revenuemanagement/rates.md`

### Partner and Distribution APIs

- Exposes property, availability, booking, rates, distribution, and iCal-oriented surfaces for external integration.
- This is part of the platform model, not a side system.
- Primary source: `docs/partner/overview.md`

### Direct Booking Website

- Adds a host-owned public website channel built on PMS-backed content and availability snapshots with a separate publish lifecycle.
- V1 is foundation-first: presentation, publish/runtime, and analytics now; public quote/booking flow later.
- See [[Direct_Booking_Website]].

## Read Next

- Use [[Direct_Booking_Website]] when work touches the public host website channel.
