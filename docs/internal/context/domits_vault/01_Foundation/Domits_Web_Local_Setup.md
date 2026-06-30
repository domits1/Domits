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
  - local: 99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/
related:
  - [[Local_Development_Setup]]
  - [[Domits_Developer_Onboarding]]
  - [[Project_Structure]]
  - [[Amplify_Localhost_Dev_SSO_Onboarding_Source]]
---
# Domits Web Local Setup

- Last synced: 2026-06-03
- Scope: practical local setup runbook for the React web app under `frontend/web`.

## Team Default

- Use the SSO-based Amplify flow unless the team explicitly gives you a legacy non-SSO login.
- Work from `frontend/web`.
- If this note and a newer team handoff disagree, follow the newer handoff and then update the vault.

## Prerequisites

- Node.js installed
- Repo cloned locally
- AWS access to the Domits account
- AWS CLI available for SSO login when needed
- Ability to install the Amplify CLI globally

Quick checks:

```bash
node -v
aws --version
```

## Setup Steps

### 1. Clone The Repo

```bash
git clone https://github.com/domits1/Domits.git
cd Domits
```

### 2. Reset Stale Amplify State

- Delete the repo-root `amplify/` folder if it exists.
- Delete `frontend/web/amplify/` if it exists.
- Then move into the web app:

```bash
cd frontend/web
```

### 3. Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify -v
```

Visual reference:

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image6.png]]

### 4. Authenticate With AWS

- If your machine already has the correct Domits SSO profile, run:

```bash
aws sso login --profile <your-current-Domits-profile>
```

- If your machine does not have the profile yet, ask the team for the exact profile name and bootstrap it first. A historical handoff used `aws configure sso --profile domits-test` before the login step.
- A useful verification command is:

```bash
aws sts get-caller-identity --profile <your-current-Domits-profile>
```

Visual references:

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image2.png]]

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image3.png]]

### 5. Pull Amplify Configuration

```bash
amplify pull --appId d34jwd0sihmsus --envName develop --profile <your-current-Domits-profile>
```

When Amplify asks follow-up questions, use:

1. `Choose your default editor` -> `None`
2. `Choose the type of app that you're building` -> `javascript`
3. `What type of javascript framework are you using` -> `react`
4. `Source directory path` -> `src`
5. `Distribution directory path` -> keep default
6. `Build command` -> keep default
7. `Start command` -> keep default
8. `Do you plan on modifying this backend` -> `no`

Visual references:

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image4.png]]

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image7.png]]

### 6. Install Dependencies

```bash
npm install
```

### 7. Start The Web App

Windows:

```bash
npm start
```

macOS:

```bash
FAST_REFRESH=false npm start
```

Default local URL:

```text
http://localhost:3000
```

## Useful Commands

```bash
npm run build
npm test
npm run lint
```

## Common Failure Patterns

- Stale local Amplify folders: delete repo-root `amplify/` and `frontend/web/amplify/`, then rerun `amplify pull`.
- Wrong AWS profile or wrong session entry: choose the actual Domits profile, not a stale session placeholder.
- Browser login loop or missing consent: complete the AWS or Amplify browser flow, then return to the terminal.
- Amplify cannot read SSO credentials: verify the profile with `aws sts get-caller-identity --profile <profile>` and retry. One historical Windows workaround used `set AWS_SDK_LOAD_CONFIG=1` before retrying `amplify pull`.
- Outdated path references: some older docs say `cd web`; in this repo the real path is `frontend/web`.

## Read Next

- Use [[Project_Structure]] for repo layout.
- Use [[Domits_Engineering_Foundation]] for delivery and backend baseline.
- Use [[Amplify_Localhost_Dev_SSO_Onboarding_Source]] if you need the full visual handoff sequence.
