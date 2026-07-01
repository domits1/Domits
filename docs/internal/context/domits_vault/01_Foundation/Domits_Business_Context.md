---
type: concept
status: active
area: business-context
owner: engineering
created: 2026-05-28
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/public/overview/intro.md
  - repo: docs/partner/overview.md
  - repo: docs/internal/data/data-foundation.md
related:
  - [[Domits_Context]]
  - [[Domits_Terminology]]
  - [[Domits_Core_Modules]]
---
# Domits Business Context

- Last synced: 2026-06-03
- Scope: stable product and platform context for Domits; read this before going into feature-specific or task-specific notes.

## What Domits Is

- Domits is a hospitality-management platform for short-term rental operations.
- It brings host operations, guest flows, bookings, availability, communication, finance, and partner connectivity into one system.
- The product is not only a guest-facing booking surface; it is also a host tooling platform and a partner/integration platform.

## Primary Actors

- Hosts manage properties, availability, pricing, payouts, messaging, and direct-booking surfaces.
- Guests search, book, pay, and communicate with hosts.
- Internal operations and support teams need reliable access to platform state, auditability, and correction flows.
- Partners such as OTAs, channel managers, payment providers, and identity providers integrate into the broader Domits ecosystem.

## Product Surface

- Property and PMS operations for listings, amenities, house rules, media, and host ownership.
- Booking and reservation flows for stay creation, status updates, and payment coordination.
- Availability, pricing, and calendar synchronization.
- Messaging and automated guest-host communication.
- Host finance and payout management.
- Partner APIs for property, availability, booking, rates, distribution, and iCal.
- Direct Booking Website as an owned host acquisition and conversion channel on top of PMS data.

## Business Shape

- Domits depends on a shared operational core that can feed multiple surfaces instead of every surface maintaining its own truth.
- Growth is tied to ecosystem leverage: host tooling, partner integrations, and owned direct-booking channels all expand distribution and operational value.
- The repo docs consistently treat PMS-aligned operational data as the base layer that downstream experiences should consume rather than fork.

## Stable Platform Constraints

- Core operational entities need one upstream source of truth.
- Guest, host, finance, partner, and analytics surfaces must stay aligned through shared data contracts.
- AWS-first, serverless delivery and operational safety are core platform constraints, not optional implementation details.

## Read Next

- Use [[Domits_Terminology]] for shared language.
- Use [[Domits_Core_Modules]] for the stable module and capability map.
