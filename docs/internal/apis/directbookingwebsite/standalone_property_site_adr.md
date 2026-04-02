# ADR - Standalone Property Site V1

## Status
Proposed

## Date
2026-03-20

## Context
Domits wants to let a host turn one PMS listing into one standalone property website without creating a separate frontend project or duplicating PMS business logic. The standalone website must keep descriptive page content fast to render and stable for design customization, while still remaining correctly aligned with PMS-controlled pricing, availability, and bookings.

The current web booking flow still performs important availability and pricing work in the browser. That is not acceptable for a serious public standalone product. The standalone layer needs its own explicit data model, public API contract, rollout plan, and security model.

The broader research direction covers the full direct-booking journey, including booking funnel and confirmation. However, the implementation-ready v1 must stay intentionally small so Domits can establish a clean base that can be extended in v2 without redesigning ownership boundaries, routing, or security fundamentals.

## Decision
Domits will design v1 of standalone property sites with these decisions locked:

1. One standalone site maps to one PMS property.
2. The standalone frontend is a single multi-tenant runtime and single deployment, not one deployment per site or per template.
3. PMS remains the upstream source for descriptive property-content import and the live source of truth for pricing, availability, and bookings.
4. The standalone layer owns site-specific configuration and published render data:
   - template selection
   - template version pin
   - branding and theme tokens
   - enabled sections
   - primary locale
   - published property snapshot
   - quote-facing timezone snapshot
   - preview token metadata
   - publish status
   - fallback domain mapping
   - analytics events
5. V1 is the foundation release. It includes:
   - property detail rendering
   - template selection and branding
   - preview and publish flow
   - fallback domain
   - server-side availability and quote
   - analytics and observability baseline
6. V1 explicitly does not include payment checkout, booking creation, or public confirmation flow.
7. V2 extends the v1 foundation with checkout, booking creation, confirmation, quote revalidation on booking, and idempotency enforcement.
8. Quote calculation is server-side only.
9. Site status is independent from PMS property listing status.
10. V1 ships with fallback Domits subdomains only. Custom domains are designed now and implemented later.
11. Public render uses standalone-owned published content snapshots and assets. PMS descriptive content is imported at publish time or explicit refresh time, not read live on every page request.
12. V1 uses English as the only supported primary site language. Full multilingual support and host-selectable locales are later.
13. Tooling stays aligned with the current Domits stack rather than introducing per-template stacks or a second rendering platform.
14. KPI measurement uses first-party event collection owned by Domits.

## Consequences

### Positive
- Prevents deployment sprawl and template drift.
- Keeps public page render fast and independent from live PMS descriptive-content latency.
- Makes public quote correctness enforceable on the server.
- Keeps the first release narrow enough to harden routing, data ownership, and publish flows before adding money-sensitive booking logic.
- Keeps template work focused on rendering and UX rather than business rules.
- Supports future custom domains and booking flow without redesigning ownership boundaries.

### Negative
- Public APIs need explicit tenant resolution and strong validation from day one.
- Publish and refresh flows must import descriptive PMS content into standalone snapshots correctly.
- Snapshot freshness and republish behavior need explicit policy and observability.
- Preview, publish, and domain lifecycle need explicit standalone tables instead of piggybacking on existing property status.
- Direct booking is not delivered in the first foundation release.

## Rejected alternatives

### One frontend per host or per template
Rejected because it creates deployment sprawl, version drift, inconsistent security posture, and painful rollback behavior.

### Frontend-owned price and availability logic
Rejected because it is vulnerable to stale state, timezone bugs, host header mixups, and quote mismatch incidents.

### Coupling site status to PMS property status
Rejected because a host must be able to keep a property live in PMS while pausing or previewing a standalone site independently.

### Live PMS descriptive reads on every public render in v1
Rejected because they add avoidable latency, couple public render availability to PMS read health, and block a clean published-content model for standalone site presentation.

### Shipping custom domains in the first implementation
Rejected because fallback subdomains are sufficient for v1 rollout and custom domains add operational complexity that is better designed now and implemented after the foundation is stable.

### Treating booking as frontend-owned logic
Rejected because checkout and booking are money-sensitive flows and must be revalidated server-side against PMS-controlled availability and pricing.

## Follow-up
Implementation details, SQL, public API examples, Mermaid diagrams, risk tables, and KPI design are defined in:

- [Standalone Property Site Design Pack](./standalone_property_site_design_pack.md)
