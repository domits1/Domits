---
type: concept
status: active
area: engineering-foundation
owner: engineering
created: 2026-05-31
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/services/overview.md
  - repo: docs/internal/architecture/aws_architecture.md
  - repo: docs/internal/data/aws_business_logic.md
  - repo: docs/internal/onboarding/backend_development_flow.md
  - repo: docs/internal/onboarding/development_workflow.md
  - repo: docs/internal/onboarding/testing_guidelines.md
  - repo: docs/internal/standards/code_conventions.md
  - repo: docs/internal/standards/clean_code_reference_guide.md
  - repo: docs/internal/data/data-foundation.md
  - repo: docs/internal/tools/orm/usage.md
  - repo: docs/internal/tools/orm/our_implementation.md
  - repo: docs/internal/tools/dsql_transitioning_docs.md
related:
  - [[Domits_Developer_Onboarding]]
  - [[Clean_Code_Standards]]
  - [[Project_Structure]]
  - [[Database_Structure]]
---
# Domits Engineering Foundation

- Last synced: 2026-06-03
- Scope: stable engineering baseline for how the Domits system is built, delivered, and kept healthy.

## Stack Snapshot

- Frontend: React web plus React Native mobile, with JavaScript/TypeScript and SASS/SCSS.
- Backend: Node.js AWS Lambda services exposed through API Gateway.
- Data: Aurora DSQL with PostgreSQL-compatible SQL as the operational database direction.
- Platform services: Amplify, Cognito, S3, IAM, Systems Manager, CloudWatch, Route 53.
- Quality and delivery: Jest, Cypress, GitHub Actions, PR review, and acceptance deployment.

## Architectural Baseline

- Domits is organized around serverless, microservice-style backend capabilities.
- Lambda functions hold backend business logic and are connected to HTTP or realtime surfaces through API Gateway.
- Amplify is part of the web delivery path.
- Cognito handles authentication and account identity.
- S3 stores asset-oriented content such as accommodation images.
- CloudWatch is the normal first stop for Lambda debugging and operational visibility.

## Backend Coding Model

- Backend functionality follows a layered architecture:
  - controller parses requests and performs top-level authorization
  - business validates and orchestrates domain logic
  - data talks to databases or external APIs
  - util owns mapping and helper behavior that does not belong in the core layers
- The backend directory is intentionally split into `CD`, `events`, `functions`, and `test`.
- The `CD` area is template/deployment scaffolding rather than a normal feature-edit surface.

## Data Access Runtime

- Domits has a shared ORM/database package under `backend/ORM/`.
- The current ORM connection model is a singleton-style `Database.getInstance()` flow rather than each lambda building ad-hoc connections.
- Database initialization depends on environment values retrieved through AWS Systems Manager and then uses Aurora DSQL-compatible credentials/signing to connect.
- Model files and schema changes are not automatically self-syncing; engineers still need to keep repo models, SQL scripts, and live Aurora structure aligned deliberately.

## Quality and Delivery Model

- Code conventions and clean-code rules are part of the review baseline, not optional polish.
- Tests should verify meaningful logic with clear assertions; trivial code does not automatically deserve separate tests.
- The normal delivery path is: update branch from `acceptance`, open PR to `acceptance`, pass CI, resolve review feedback, then merge.
- `npm run createLambda` scaffolds or registers backend functions, but API Gateway exposure still requires deliberate follow-through when a new endpoint is needed.

## Data and Observability Direction

- Canonical operational data belongs in Aurora DSQL.
- Heavy analytics, AI, BI, or long-horizon reporting should move into derived analytical layers instead of overloading OLTP tables.
- Operational feedback loops include CloudWatch logs, CI health, and acceptance deployment outcomes.
- Legacy DynamoDB references still exist in docs and code, but they are migration/refactor context rather than the target direction.
- AWS service usage in repo docs is broader than the narrow app runtime alone; the platform also leans on Systems Manager, IAM, Route 53, and other AWS operations surfaces that matter during debugging and deployment.

## Read Next

- Use [[Clean_Code_Standards]] and [[Sonar_Conventions]] for review and implementation rules.
- Use [[Project_Structure]] for repo layout.
- Use [[Database_Structure]] for the data-model baseline.
