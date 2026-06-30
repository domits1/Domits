---
type: source
status: active
project: messaging
area: repo-doc-import
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
  - [[Messaging]]
---
# Messaging Repo Sources

- Last synced: 2026-06-03
- Scope: curated repo-doc map for durable Domits messaging knowledge.

## Primary Source Docs

- `docs/internal/apis/messaging/messaging_overview.md`
  - short capability and architecture overview
- `docs/internal/apis/messaging/unified_messaging_layer.md`
  - the best current source for the shared web/mobile contract, endpoints, payloads, and roadmap gaps
- `docs/internal/apis/messaging/messaging_backend.md`
  - backend API shape, auth, message flow, and schema
- `docs/internal/apis/messaging/messaging_frontend.md`
  - web/mobile entry points, hooks, and message payload behavior
- `docs/internal/apis/messaging/messaging_runbook.md`
  - operational troubleshooting and FAQs
- `docs/internal/apis/messaging/messaging_testing.md`
  - demos, integration tests, and manual QA checklist

## Source-of-Truth Rule

- Use `unified_messaging_layer.md` for the broadest current implementation picture.
- Use the backend and frontend docs when changing a specific side of the feature.
- Use the runbook and testing docs when validating runtime behavior or debugging message flow issues.

## Durable Caveats

- Treat the documented deployed API surface as real even when some corresponding backend source code is not fully present under `backend/`.
- Treat the external-channel unified inbox as roadmap context, not as already shipped behavior.
