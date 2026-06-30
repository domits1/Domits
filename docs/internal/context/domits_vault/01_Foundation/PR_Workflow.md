---
type: runbook
status: active
area: developer-workflow
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/onboarding/development_workflow.md
related:
  - [[Delivery_Workflow]]
  - [[PR_Review_Workflow]]
  - [[Acceptance_Deployment]]
  - [[Acceptance_To_Main_Release]]
---
# PR Workflow

- Last synced: 2026-06-03
- Scope: normal workflow from finished local work to merge into `acceptance`.

## 1. Sync With `acceptance`

Before opening the PR, update your branch from `acceptance`:

```bash
git pull origin acceptance
```

- Resolve conflicts in your branch before asking for review.
- If the conflict feels risky or unclear, escalate early instead of brute-forcing it.

## 2. Recheck Conventions

- Verify the code still follows Domits code conventions.
- Run the relevant local checks before review where possible.

## 3. Open The Pull Request

- Base branch: `acceptance`
- Compare branch: your working branch
- Use a conventional-commit-style title.
- Fill in the PR template completely.

## 4. Handle Review Iterations

- Read comments carefully.
- Push updates to the same branch.
- Respond inside the PR so the reasoning stays attached to the code review.

## 5. Get To Green

- All CI checks must pass before merge.
- Fix failing tests, builds, or blocked checks in the branch and push again.

## 6. Merge Into `acceptance`

The normal merge gate is:

- 2 approvals
- all review comments resolved
- CI green

After merge, continue with [[Acceptance_Deployment]].

## Backend-Specific Follow-Through

- A merged Lambda is not automatically a usable frontend endpoint.
- If the work introduces a new API surface, you still need API Gateway resources, methods, CORS, and API deployment after the code merge path succeeds.

## Read Next

- Use [[PR_Review_Workflow]] if you are switching from author mode into reviewer mode.
- Use [[Acceptance_Deployment]] after the merge lands.
