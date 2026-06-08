# Running Domits Locally - SSO

This document explains how to get the Domits web project running on your machine for local development with the newer AWS SSO-based onboarding flow.

## When to use this document

Use this document if:

- the original [running Domits locally.md](./running%20Domits%20locally.md) flow does not work for you
- your AWS access uses the newer SSO profile setup
- you received the newer Amplify onboarding handoff from the team

## Prerequisites

Before you start, make sure you have:

- [Node.js](https://nodejs.org/) installed
- access to the Domits AWS account via the current SSO flow
- the AWS CLI installed if you need to authenticate through `aws sso login`

Check that Node.js is installed correctly:

```bash
node -v
```

## Clone the repository

Clone the repository locally:

```bash
git clone https://github.com/domits1/Domits.git
```

## Reset old Amplify state

If you already have old Amplify state locally, remove it first before pulling the current backend configuration:

- delete the root `amplify/` folder in the repo if it exists
- delete the `frontend/web/amplify/` folder if it exists

Then move into the web project:

```bash
cd frontend/web
```

## Amplify setup

Domits uses AWS Amplify for frontend/backend environment configuration.

### 1. Install the Amplify CLI

Install the Amplify CLI globally:

```bash
npm install -g @aws-amplify/cli
```

Check that the install worked:

```bash
amplify -v
```

### 2. Authenticate with AWS via SSO

The current onboarding flow uses AWS SSO profile login. Do not rely on the older static-login flow.

Run:

```bash
aws sso login --profile <your-current-Domits-profile>
```

Use the current Domits profile provided in the onboarding handoff or by the team.

### 3. Pull the Amplify backend configuration

After the SSO login succeeds, pull the Amplify configuration using the same AWS profile:

```bash
amplify pull --appId d34jwd0sihmsus --envName develop --profile <your-current-Domits-profile>
```

If the team handoff gives you a different profile or environment name, follow that newer handoff value.

If the standard pull fails, retry with the explicit profile-based flow and make sure you select:

- `AWS profile`
- your actual Domits profile
- not a random session entry

If needed, remove the local `amplify/` folders again and rerun the command.

### 4. Amplify prompt answers

When Amplify asks follow-up questions, use:

1. `Choose your default editor` -> `None`
2. `Choose the type of app that you're building` -> `javascript`
3. `What type of javascript framework are you using` -> `react`
4. `Source directory path` -> `src`
5. `Distribution directory path` -> keep the default
6. `Build command` -> keep the default
7. `Start command` -> keep the default
8. `Do you plan on modifying this backend` -> `no`

## Install dependencies

Install the project dependencies:

```bash
npm install
```

## Start the web app

For Windows:

```bash
npm start
```

For macOS:

```bash
FAST_REFRESH=false npm start
```

The application should then be available at:

```text
http://localhost:3000
```

## Additional commands

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## Development environment

- Node.js version: `>=14.0.0`
- React version: `^18.2.0`

## Notes

- This document is for the web project only.
- If local setup and the latest onboarding handoff disagree, follow the newer SSO/AWS access flow and update this document.
- Once you are running locally, continue with the relevant onboarding/API docs from the main `README.md`.