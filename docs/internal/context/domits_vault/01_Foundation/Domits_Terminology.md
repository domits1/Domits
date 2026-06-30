---
type: glossary
status: active
area: terminology
owner: engineering
created: 2026-05-28
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/data/data-foundation.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_design_pack.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_naming.md
  - repo: docs/partner/overview.md
related:
  - [[Domits_Business_Context]]
---
# Domits Terminology

- Last synced: 2026-06-03
- Scope: durable shared terms that show up across product, platform, and direct-booking work.

## Core Terms

- `PMS`: the Domits property-management and operational source of truth for listings, availability, pricing, and booking-aligned domain data.
- `Host`: the supply-side user who owns or manages properties and uses host-facing product surfaces such as dashboard, calendar, finance, and direct-booking website tools.
- `Guest`: the demand-side user who searches, books, pays, and communicates through Domits surfaces.
- `Partner`: an external integration party such as an OTA, channel manager, payment provider, or other platform that connects through partner-facing APIs.
- `Canonical data`: Domits' normalized internal representation of business entities, designed to hide source-specific differences from downstream consumers.
- `Raw data`: source-aligned payloads or events kept for traceability, replay, debugging, or reconciliation before full normalization.
- `Acceptance`: the shared integration branch and environment where changes are reviewed and deployed before broader release steps.
- `iCal`: calendar import/export format used for availability synchronization with external systems.
- `OTA`: online travel agency; an external booking/distribution channel that Domits may integrate with.
- `KPI`: key performance indicator used for operational, host, or product reporting.

## Direct Booking Website Terms

- `Direct Booking Website`: the current feature name for the host-owned public website channel.
- `Fallback domain`: the Domits-managed subdomain used for a published website before custom domains are supported.
- `Draft`: the editable working website state owned by the host/editor flow.
- `Published site`: the public website state that is served from standalone-owned published data after an explicit publish action.
- `Published snapshot`: the descriptive PMS-backed content copied into the public website state for fast, stable render behavior.
- `standalone_*`: legacy storage naming that still exists for direct-booking website tables and historical migrations even though the feature name is now `Direct Booking Website`.
- `Internal preview`: the private preview route used to inspect a saved draft before or alongside public publish steps.

## Usage Rule

- Use current feature names for new docs, comments, variables, and developer-facing copy.
- Keep legacy storage names only when they refer to already deployed database objects or historical migration files.
