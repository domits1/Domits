---
type: concept
status: active
area: repo-context
owner: engineering
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/onboarding/backend_development_flow.md
  - repo: docs/internal/standards/code_conventions.md
related:
  - [[Domits_Developer_Onboarding]]
  - [[Domits_Engineering_Foundation]]
  - [[Database_Structure]]
---
# Project Structure

- Last synced: 2026-06-03
- Scope: stable map of where the main Domits code and documentation live.

## Top-Level Areas

- `backend/`: lambda backend source, ORM/data-layer work, local events, tests, and deployment scaffolding.
- `frontend/`: React web plus React Native app source.
- `docs/`: internal, partner, public, and security documentation.
- `tools/`: maintenance and helper scripts used during repo work.
- `.github/`: workflow and repository automation files.

## Backend Layout

- `backend/CD/`: backend scaffolding and deployment-oriented templates.
- `backend/functions/`: lambda source code.
- `backend/events/`: local invocation payloads and smoke-style execution files.
- `backend/test/`: backend tests.
- `backend/ORM/`: schema and shared database access layer work.

## Frontend Layout

- `frontend/web/src/`: main web source tree.
- `frontend/web/src/features/`: preferred home for feature-specific work.
- `frontend/web/src/components`, `services`, `hooks`, `context`, `styles`, and `tests`: shared or cross-feature surfaces.
- `frontend/app/Domits/src/`: mobile source tree with a broadly similar feature-oriented split.

## Docs Layout

- `docs/internal/context/`: durable repo-local context such as the Domits Obsidian vault for developers and LLM onboarding.
- `docs/internal/onboarding/`: setup, workflow, and onboarding notes.
- `docs/internal/apis/`: domain and API documentation.
- `docs/internal/data/` and `docs/internal/architecture/`: database, data-platform, and system context.
- `docs/internal/tools/`: implementation details for shared tooling such as ORM and migrations.
- `docs/internal/infra/`: CI, deployment, and workflow-oriented infrastructure documentation.
- `docs/internal/qa/`: testing guidance.
- `docs/internal/standards/`: code and style rules.
- `docs/partner/`, `docs/public/`, and `docs/security/`: integration, outward-facing, and security material.

## Placement Rules

- Put feature-specific frontend code in the owning feature folder before reaching for global folders.
- Put shared frontend contracts in shared folders only when they are actually reused.
- Keep backend logic inside the lambda's layered boundary instead of leaking data access into controllers or UI concerns into business logic.
- Add docs in the narrowest domain that owns them; do not rely on `README.md` as the only source of truth.

## Read Next

- Use [[Domits_Developer_Onboarding]] when setting up or orienting.
- Use [[Database_Structure]] when the task depends on schema or data ownership.
