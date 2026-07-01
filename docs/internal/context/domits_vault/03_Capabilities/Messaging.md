---
type: project
status: active
project: messaging
area: feature-context
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/apis/messaging/messaging_overview.md
  - repo: docs/internal/apis/messaging/unified_messaging_layer.md
  - repo: docs/internal/apis/messaging/messaging_backend.md
  - repo: docs/internal/apis/messaging/messaging_frontend.md
  - repo: docs/internal/apis/messaging/messaging_runbook.md
  - repo: docs/internal/apis/messaging/messaging_testing.md
related:
  - [[Domits_Core_Modules]]
  - [[Messaging_Repo_Sources]]
---
# Messaging

- Last synced: 2026-06-03
- Scope: durable feature contract for Domits guest-host messaging and automated message delivery.

## Feature Purpose

- Messaging provides realtime communication between hosts and guests.
- The same pipeline also supports automated booking-triggered messages such as confirmation, check-in, Wi-Fi, and check-out instructions.

## Current Architecture

- Realtime delivery uses AWS API Gateway WebSocket transport.
- History and supporting data use HTTP endpoints backed by Lambda.
- Web and mobile clients follow the same high-level contract:
  - pairwise sender/recipient model
  - stable `channelId`
  - shared payload shape for outbound and inbound messages
- Automated messages reuse the same messaging surface rather than a separate notification-only path.

## Current Implementation Baseline

- Web messaging is centered on `ContactList`, `ChatScreen`, fetch hooks, send hooks, and a shared WebSocket context/provider flow.
- Mobile messaging mirrors the same behavior through its own provider and hooks.
- The current docs include backend API shape, frontend entry points, testing demos, and an operational runbook.
- Local/demo behavior exists on web through local-room helpers for limited backend-free testing.

## Known Constraints

- Some deployed messaging Lambda/API surfaces are documented and actively used by clients, but the corresponding backend handler source does not appear to be fully present in this repository.
- Some messaging URLs are still hardcoded in client code instead of being fully centralized configuration.
- The broader unified inbox vision for external channels is still roadmap work rather than a completed production feature.

## Read Next

- Use [[Messaging_Repo_Sources]] for the repo-doc map.
