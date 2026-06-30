---
type: runbook
status: active
area: developer-onboarding
owner: engineering
created: 2026-05-31
updated: 2026-06-03
confidence: high
source:
  - repo: README.md
  - repo: docs/internal/onboarding/running Domits locally.md
  - repo: docs/internal/onboarding/running Domits locally - SSO.md
  - repo: docs/internal/onboarding/backend_setup.md
  - repo: docs/internal/onboarding/backend_development_flow.md
  - repo: docs/internal/onboarding/development_workflow.md
  - repo: docs/internal/onboarding/github_onboarding.md
  - repo: docs/internal/onboarding/aws_onboarding.md
  - repo: docs/internal/onboarding/pr_reviewer_onboarding.md
  - repo: docs/internal/onboarding/merge_main_into_acceptance.md
  - repo: docs/internal/onboarding/testing_guidelines.md
  - repo: docs/internal/onboarding/programming_levels.md
  - repo: docs/internal/onboarding/app/app_onboarding.md
  - repo: docs/internal/onboarding/app/android_setup.md
  - repo: docs/internal/onboarding/app/android_macOS_setup.md
  - repo: docs/internal/onboarding/app/ios_setup.md
related:
  - [[Domits_Context]]
  - [[Local_Development_Setup]]
  - [[Delivery_Workflow]]
  - [[Domits_Engineering_Foundation]]
  - [[Project_Structure]]
  - [[Database_Structure]]
---
# Domits Developer Onboarding

- Last synced: 2026-06-03
- Scope: durable onboarding map for new developers and AI assistants working in the Domits repo.

## Default Startup Order

1. `README.md`
2. `Domits_Context.md`
3. this note
4. `Local_Development_Setup.md` if local machine or runtime setup matters
5. `Project_Structure.md`
6. `Domits_Engineering_Foundation.md`
7. `Database_Structure.md` when schema or ORM work matters
8. `Delivery_Workflow.md` once work is moving toward review or release

## Choose The Right Path

- New web, mobile, or backend contributor who needs a working local environment: start with [[Local_Development_Setup]].
- Contributor preparing a PR, reviewing a PR, or handling deployment and release flow: start with [[Delivery_Workflow]].
- Contributor doing deeper implementation or architecture work after setup: move into [[Domits_Engineering_Foundation]], [[Project_Structure]], and [[Database_Structure]].

## Access Baseline

- GitHub access is expected to come from teams, not direct per-repo permissions.
- GitHub 2FA is mandatory.
- AWS access is group-based and least-privilege.
- If GitHub or AWS access is missing, fix that before debugging local setup failures.
- AWS CLI is part of the practical setup baseline for backend work and the newer web SSO path.

## Testing And Growth Context

- `programming_levels.md` is useful for growth expectations and role calibration, but it is not the repo's day-to-day source of truth for architecture or workflow.

## Read Next

- Use [[Local_Development_Setup]] for web, mobile, or backend setup routing.
- Use [[Delivery_Workflow]] for PR, review, deployment, and release routing.
- Use [[Project_Structure]] for where code and docs live.
- Use [[Domits_Engineering_Foundation]] for system and delivery baseline.
- Use [[Database_Structure]] when the task touches ORM or schema work.
