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
  - repo: docs/internal/onboarding/pr_reviewer_onboarding.md
  - repo: docs/internal/onboarding/testing_guidelines.md
  - repo: docs/internal/onboarding/merge_main_into_acceptance.md
related:
  - [[Domits_Developer_Onboarding]]
  - [[PR_Workflow]]
  - [[PR_Review_Workflow]]
  - [[Testing_Guidance]]
  - [[Acceptance_Deployment]]
  - [[Acceptance_To_Main_Release]]
---
# Delivery Workflow

- Last synced: 2026-06-03
- Scope: routing hub for how local Domits work moves through PR, review, testing, acceptance, and production release.

## When To Use This Note

- Use this note when local work is no longer the problem and the next question is "how does this safely move through the team workflow?"
- Pick the child note that matches your current role: author, reviewer, tester, release owner, or post-merge verifier.

## Choose The Right Workflow

- Opening and merging normal feature work into `acceptance`: use [[PR_Workflow]].
- Reviewing someone else's pull request: use [[PR_Review_Workflow]].
- Rechecking what Domits means by good tests: use [[Testing_Guidance]].
- Verifying the result after merge to `acceptance`: use [[Acceptance_Deployment]].
- Promoting `acceptance` into `main`: use [[Acceptance_To_Main_Release]].

## Shared Rules

- `acceptance` is the normal integration target for everyday work.
- `main` is a release branch, not a normal feature target.
- CI must be green before merge.
- Backend logic may still require API Gateway follow-through even after the Lambda code is merged and deployed.

## Read Next

- Use [[PR_Workflow]] if you are the author of the change.
- Use [[PR_Review_Workflow]] if you are reviewing a PR.
- Use [[Acceptance_To_Main_Release]] only when handling a production release.
