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
  - repo: docs/internal/onboarding/running Domits locally.md
  - repo: docs/internal/onboarding/running Domits locally - SSO.md
  - repo: docs/internal/onboarding/backend_setup.md
  - repo: docs/internal/onboarding/app/app_onboarding.md
  - repo: docs/internal/onboarding/app/android_setup.md
  - repo: docs/internal/onboarding/app/android_macOS_setup.md
  - repo: docs/internal/onboarding/app/ios_setup.md
related:
  - [[Domits_Developer_Onboarding]]
  - [[Domits_Web_Local_Setup]]
  - [[Domits_Mobile_App_Setup]]
  - [[Domits_Backend_Setup]]
  - [[Project_Structure]]
---
# Local Development Setup

- Last synced: 2026-06-03
- Scope: routing hub for machine setup and local runtime setup across web, mobile, and backend work.

## When To Use This Note

- Use this note after `Domits_Developer_Onboarding.md` when the immediate problem is "how do I get the right part of Domits running locally?"
- Pick one child runbook based on the surface you actually need to work on.
- Do not read every setup note by default; choose the narrowest relevant path.

## Choose Your Runtime

- Web work in `frontend/web`: use [[Domits_Web_Local_Setup]].
- Mobile work in `frontend/app/Domits`: use [[Domits_Mobile_App_Setup]].
- Lambda, AWS, or backend scaffolding work: use [[Domits_Backend_Setup]].

## Shared Setup Rules

- Clone the repo before starting any setup branch.
- Node.js is part of the baseline for every local path.
- AWS access problems should be solved before debugging Amplify or backend setup failures.
- If an older repo doc conflicts with a newer team handoff, use the newer handoff and then update the vault.
- Mobile Windows setups still benefit from a short clone path because React Native path-length issues remain real.

## Read Next

- Use [[Project_Structure]] if you need the repo map before choosing a runtime branch.
- Use [[Domits_Engineering_Foundation]] once the local environment is running and you need system-level context.
