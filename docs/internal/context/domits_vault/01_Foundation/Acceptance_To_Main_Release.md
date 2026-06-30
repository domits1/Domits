---
type: runbook
status: active
area: developer-workflow
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/onboarding/merge_main_into_acceptance.md
related:
  - [[Delivery_Workflow]]
  - [[Acceptance_Deployment]]
---
# Acceptance To Main Release

- Last synced: 2026-06-03
- Scope: release-only workflow for promoting `acceptance` into `main`.

## Core Rule

- This is not a normal feature PR.
- It is a release merge from `acceptance` into `main`.

## Release Steps

1. Open a PR with:
   - base branch `main`
   - compare branch `acceptance`
2. Use a clear release title such as:

```text
chore(release): merge acceptance into main
```

3. Fill in the PR template briefly but correctly.
4. Temporarily relax the `main` branch approval requirement if the release process requires it.
5. Merge the PR.
6. Verify the production deployment in AWS Amplify.
7. Verify the live site at `https://www.domits.com/`.
8. Restore the `main` branch protection immediately.

## Release Safety

- Double-check the branch direction before creating the PR.
- Failing to restore branch protection creates structural risk.
- If the production deployment or critical live flows fail, notify the team immediately.

## Read Next

- Use [[Acceptance_Deployment]] for the normal post-merge acceptance verification path.
