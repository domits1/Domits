---
type: source
status: active
project: direct-booking-website
area: repo-doc-import
owner: engineering
created: 2026-05-31
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_handoff.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_design_pack.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_adr.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_plan_of_approach.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_frontend_status.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_implementation_log.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_naming.md
  - repo: docs/internal/apis/directbookingwebsite/bookingengine.md
  - repo: docs/internal/apis/calendar/host_guest_calendar_workflow.md
  - repo: docs/internal/apis/propertyhandler/property_handler.md
  - repo: docs/internal/apis/bookingengine/booking_and_reservation.md
related:
  - [[Direct_Booking_Website]]
---
# Direct Booking Website Repo Sources

- Last synced: 2026-06-03
- Scope: curated repo-doc map for durable Direct Booking Website knowledge.

## Primary Source Docs

- `docs/internal/apis/directbookingwebsite/direct_booking_website_handoff.md`
  - the practical pickup doc for the next engineer before going deeper into status, design, ADR, and history
- `docs/internal/apis/directbookingwebsite/direct_booking_website_design_pack.md`
  - the main v1 contract for scope, state model, system boundaries, and rollout shape
- `docs/internal/apis/directbookingwebsite/direct_booking_website_adr.md`
  - architectural decisions, tradeoffs, and rejected alternatives
- `docs/internal/apis/directbookingwebsite/direct_booking_website_plan_of_approach.md`
  - research framing, rationale, and the broader feature direction behind the implementation
- `docs/internal/apis/directbookingwebsite/direct_booking_website_frontend_status.md`
  - shipped builder/editor/runtime behavior and what is still incomplete
- `docs/internal/apis/directbookingwebsite/direct_booking_website_implementation_log.md`
  - append-only chronological history when sequence matters
- `docs/internal/apis/directbookingwebsite/direct_booking_website_naming.md`
  - current naming standard plus legacy compatibility rules
- `docs/internal/apis/directbookingwebsite/bookingengine.md`
  - direct-booking website doc entry point for booking-engine-adjacent design material

## Upstream Dependency Docs

- `docs/internal/apis/propertyhandler/property_handler.md`
  - PMS property data and access-control patterns that feed website content
- `docs/internal/apis/calendar/host_guest_calendar_workflow.md`
  - host calendar, pricing, overrides, and iCal sync behavior that feeds website availability snapshots
- `docs/internal/apis/bookingengine/booking_and_reservation.md`
  - booking lifecycle and guest payment context that later public booking flows must respect

## Source-of-Truth Rule

- Use the design pack for the durable v1 contract.
- Use the handoff doc when you are picking the feature up cold and need the fastest accurate entry point.
- Use the ADR for why key architecture choices were made.
- Use the frontend status doc for what is actually shipped.
- Use the current-task note for active implementation deltas that have not yet been folded back into the durable docs.

## Naming Caveat

- The feature name is `Direct Booking Website`.
- Legacy `standalone_*` table names still appear in storage, migrations, and some historical docs because they refer to already deployed objects.
