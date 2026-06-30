---
type: concept
status: active
area: database-context
owner: engineering
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/data/database_model.md
  - repo: docs/internal/data/database-erd.md
  - repo: docs/internal/data/data-foundation.md
  - repo: docs/internal/architecture/database_architecture_design.md
  - repo: docs/internal/tools/orm/usage.md
  - repo: docs/internal/tools/orm/our_implementation.md
  - repo: docs/internal/tools/orm/typeorm.md
  - repo: docs/internal/tools/dsql_transitioning_docs.md
related:
  - [[Domits_Engineering_Foundation]]
  - [[Project_Structure]]
---
# Database Structure

- Last synced: 2026-06-03
- Scope: stable operational database direction and modeling rules for Domits.

## Operational Database Direction

- Domits uses Aurora DSQL with PostgreSQL-compatible SQL as the operational database direction.
- Legacy DynamoDB references still exist in code and docs and should be treated as migration/refactor context rather than the target architecture.

## ERD Coverage

- The current ERD is maintained in Lucidchart and split into three readable sections:
  1. Core Property ERD
  2. Messaging and Integrations ERD
  3. Operations, Analytics, and Standalone Site ERD
- The repo-side ERD reference note is `docs/internal/data/database-erd.md`.

## Domain Coverage

- users and identities
- properties, amenities, rules, media, and listing ownership
- bookings, payments, payouts, pricing, and availability
- messaging, partner integrations, sync state, and logs
- tasks, KPI snapshots, and standalone website tables

## Modeling Rules

- Normalize reusable reference data and use join tables for many-to-many relations.
- Keep raw or source-specific integration payloads separate when traceability, replay, or reconciliation matters.
- Add indexes for real access patterns such as host/property lookup, booking by date or status, messaging by thread/timestamp, and integration/provider mapping.
- Use transactions for multi-write business operations such as booking creation, payment confirmation, payout processing, and publish flows.
- Make webhook and partner-event processing idempotent so retries do not duplicate business effects.

## Data Access and Analytical Split

- Prefer the shared TypeORM-based access layer where possible.
- Keep Aurora focused on OLTP workloads and canonical operational data.
- Move heavy BI, analytics, ML, and GenAI workloads into derived analytical layers rather than stretching operational tables beyond their role.

## ORM and Schema Implementation Notes

- The repo ORM expects engineers to import the shared `database` package and explicit models from `backend/ORM/models`.
- Connection initialization is centralized through the ORM singleton rather than recreated in every call path.
- Adding a model is not enough by itself:
  - add the model file
  - update the SQL/schema scripts
  - apply the matching change in Aurora DSQL
- `schema.psql` is powerful but dangerous because it can recreate schema state; treat it as infrastructure-level material, not a casual day-to-day script.

## Read Next

- Use [[Domits_Engineering_Foundation]] for the broader system model.
