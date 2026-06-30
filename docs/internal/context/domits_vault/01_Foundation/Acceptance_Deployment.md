---
type: runbook
status: active
area: developer-workflow
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/onboarding/development_workflow.md
related:
  - [[Delivery_Workflow]]
  - [[PR_Workflow]]
  - [[Acceptance_To_Main_Release]]
---
# Acceptance Deployment

- Last synced: 2026-06-03
- Scope: what to verify after a PR is merged into `acceptance`.

## After Merge

- Merge to `acceptance` starts the acceptance deployment automatically.
- Check deployment state in AWS Amplify.
- Verify the result in `https://acceptance.domits.com/`.

## Minimum Verification

- The deployment completed successfully.
- The changed surface actually works in acceptance.
- Critical nearby flows were not obviously broken by the change.

## If Deployment Fails

- Notify the team immediately.
- Do not assume the failure will self-correct.

## Backend Endpoint Follow-Through

If the merged work introduced backend logic that must be reachable over HTTP:

1. Open API Gateway.
2. Create the resource.
3. Create the required HTTP method.
4. Configure Lambda proxy integration.
5. Enable CORS, including `OPTIONS`.
6. Deploy the API to the correct stage.
7. Verify the endpoint and check CloudWatch if it fails.

- The developer who introduced the endpoint is responsible for exposing and validating it.

## Read Next

- Use [[Acceptance_To_Main_Release]] only when the change is part of a production release.
