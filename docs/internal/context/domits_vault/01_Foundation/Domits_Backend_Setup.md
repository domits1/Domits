---
type: runbook
status: active
area: developer-onboarding
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/onboarding/backend_setup.md
  - repo: docs/internal/onboarding/backend_development_flow.md
  - repo: docs/internal/onboarding/development_workflow.md
  - repo: docs/internal/onboarding/aws_onboarding.md
related:
  - [[Local_Development_Setup]]
  - [[Domits_Engineering_Foundation]]
  - [[Project_Structure]]
  - [[Delivery_Workflow]]
---
# Domits Backend Setup

- Last synced: 2026-06-03
- Scope: machine and repo setup for backend Lambda work under `backend/`.

## Prerequisites

- Node.js installed
- Repo cloned locally
- AWS access to the Domits account
- AWS CLI available and working

Quick checks:

```bash
aws --version
```

## Credential Baseline

- The older repo backend setup doc shows an access-key-based `aws configure` flow.
- Newer Domits onboarding context also uses group-based AWS access and SSO in parts of the stack.
- The durable requirement is not one exact credential bootstrap method; the durable requirement is that your local AWS CLI can successfully talk to the correct Domits account and region.
- The normal region reference in repo onboarding is `eu-north-1`.

Useful verification commands:

```bash
aws s3 ls
aws sts get-caller-identity
```

## First Backend Steps

Move into the backend root and install dependencies there:

```bash
cd backend
npm install
```

- Install backend dependencies only from the backend root, not from nested function folders.
- Review the layered `controller -> business -> data` structure before writing new logic.

## Creating Or Registering A Lambda

- Create a new Lambda scaffold:

```bash
npm run createLambda
```

- Register or migrate an already-existing AWS function into repo structure:

```bash
npm run createLambda false
```

- Use the exact existing Lambda name when registering an already-existing function.

## Local Execution Pattern

- Local smoke-style runs use `backend/events`.
- Generated event files can be run with Node once their import path is correct.
- A practical flow is:
  1. create or open the event file under `backend/events/<function>/`
  2. verify the handler import points to the real function file
  3. run the event file with Node

Example pattern:

```bash
node events/<function>/get.js
```

## Testing Pattern

- Backend tests live in `backend/test`.
- Prefer focused tests with clear assertions over broad unclear tests.
- Use local event runs for smoke-style execution and dedicated tests for stable behavior checks.

## Important Limitation

- `npm run createLambda` does not automatically make a frontend-callable HTTP endpoint.
- If the new backend logic needs an API surface, API Gateway resources, methods, CORS, and deployment still need explicit follow-through after the Lambda exists.
- Use [[Delivery_Workflow]] once the work is moving toward PR, acceptance, or release.

## Read Next

- Use [[Domits_Engineering_Foundation]] for the backend architecture model.
- Use [[Project_Structure]] for where backend files live.
- Use [[Delivery_Workflow]] when local work is ready to move through review and deployment.
