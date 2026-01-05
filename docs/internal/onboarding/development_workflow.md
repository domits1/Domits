# Development Workflow: From Finished Work to Acceptance Deployment

This document explains **what to do after you finish your work** (feature, fix, or documentation) and how it safely reaches the **acceptance environment**.

This workflow is mandatory. Skipping steps will result in blocked PRs, failed reviews, or broken deployments.

> [!IMPORTANT]  
> This workflow assumes you already understand how Domits is set up and how backend development works.
>
> Before continuing, make sure you are familiar with the following documentation:
>
> - [Running Domits locally](https://github.com/domits1/Domits/blob/acceptance/docs/internal/onboarding/running%20Domits%20locally.md)
>
> - [Backend Setup (AWS Lambda)](https://github.com/domits1/Domits/blob/acceptance/docs/internal/onboarding/backend_setup.md)  
>   Explains how backend functions are created, structured, tested, and run locally.
>
> - [Backend Development Flow](https://github.com/domits1/Domits/blob/acceptance/docs/internal/tools/backend_development_flow.md)
>   Describes the backend architecture, layers (controller/business/data), directory structure, and deployment flow.

---

## Table of Contents

- [Development Workflow: From Finished Work to Acceptance Deployment](#development-workflow-from-finished-work-to-acceptance-deployment)
  - [Table of Contents](#table-of-contents)
  - [1. Sync Your Branch With `acceptance`](#1-sync-your-branch-with-acceptance)
  - [1.1 Resolving Merge Conflicts](#11-resolving-merge-conflicts)
    - [How to resolve merge conflicts](#how-to-resolve-merge-conflicts)
    - [Time expectations](#time-expectations)
    - [When and how to escalate](#when-and-how-to-escalate)
  - [2. Verify Code Conventions](#2-verify-code-conventions)
  - [3. Create a Pull Request](#3-create-a-pull-request)
    - [Creating a PR via GitHub](#creating-a-pr-via-github)
    - [PR Title](#pr-title)
    - [PR Template](#pr-template)
  - [4. Code Review Process](#4-code-review-process)
    - [Required approvals](#required-approvals)
    - [Reviewer responsibilities](#reviewer-responsibilities)
    - [Handling review comments](#handling-review-comments)
  - [5. CI Checks Must Pass](#5-ci-checks-must-pass)
  - [6. Merging to `acceptance`](#6-merging-to-acceptance)
  - [7. Automatic Deployment to Acceptance](#7-automatic-deployment-to-acceptance)
  - [8. Exposing Your Backend Logic via API Gateway](#8-exposing-your-backend-logic-via-api-gateway)
    - [Important: What `npm run createLambda` does (and does not do)](#important-what-npm-run-createlambda-does-and-does-not-do)
    - [Creating an API Gateway Resource and Method](#creating-an-api-gateway-resource-and-method)
      - [Step 1: Create a Resource](#step-1-create-a-resource)
      - [Step 2: Create a Method](#step-2-create-a-method)
      - [Step 3: Configure the Method Integration](#step-3-configure-the-method-integration)
    - [Enabling CORS (Required)](#enabling-cors-required)
    - [Deploy the API](#deploy-the-api)
    - [Verify the Endpoint](#verify-the-endpoint)
    - [Responsibility](#responsibility)
  - [Further Learning \& Growth](#further-learning--growth)

---

## 1. Sync Your Branch With `acceptance`

Before creating a PR, your branch must be up-to-date with `acceptance`.

While on your own branch, pull the latest changes from `acceptance`:

```bash
git pull origin acceptance
```

This will merge the latest acceptance changes into your branch.

Why this is required:

- Detects merge conflicts early
- Ensures your changes are based on the latest integrated code
- Prevents last-minute conflicts during PR review

If merge conflicts appear, resolve them in your branch, commit the fixes, and push the updated branch before opening the PR.

> [!NOTE]
> Team members are encouraged to regularly pull the latest `acceptance` branch and run the application locally.
> This helps detect integration issues, or broken functionality early, before problems reach production or block others.

## 1.1 Resolving Merge Conflicts

Merge conflicts can occur when changes in your branch overlap with changes already merged into `acceptance`.

### How to resolve merge conflicts

When running:

```bash
git pull origin acceptance
```

Git may report merge conflicts.

Steps to resolve them:

1. Open the files listed by Git
2. Locate conflict markers:
  ```javascript
  <<<<<<<
  =======
  >>>>>>>
  ```
1. Decide which changes to keep:
   - Your changes
   - Incoming changes
   - Or a combination of both
2. Remove **all** conflict markers
3. Run the application and relevant tests locally
4. Commit the resolved changes
5. Push the updated branch

Never commit files that still contain conflict markers (merge conflicts).

---

### Time expectations

Merge conflicts do **not** have a fixed time limit.

How long resolving conflicts takes depends on:
- How long your branch diverged from `acceptance`
- The size of your PR (max 300–500 lines is the guideline, not a guarantee)
- The type of changes (formatting vs. business logic)
- Your familiarity with the affected code

**Guideline (not a hard rule):**
- Small, recent conflicts are usually resolved quickly
- Larger or long-lived branches may require more time

If resolving conflicts starts to feel risky, unclear, or frustrating, **do not brute-force it**.

Instead:
- Ask for help early
- Communication is always cheaper than guessing

You can request help via:
- **Discord** → Domits channel: `#4engineering-security`
- **In person** if you are working from the office

Being stuck in silence is worse than asking for help.  
Merge conflicts are a team problem, not a personal failure.

> [!NOTE]
> Escalation is expected and encouraged when safety or clarity is at risk.
> Asking for help early is a sign of professionalism, not lack of skill.


---

### When and how to escalate

Escalation is expected **when clarity or safety is at risk**, not after everything breaks.

Escalate when:
- The conflict involves critical or unclear business logic
- You do not understand the intent behind the conflicting code
- Many files are affected and the solution feels unsafe or speculative

How to escalate effectively:
- Push your branch (even if conflicts are unresolved)  
  This allows others to inspect the exact conflict state locally.
- Share:
  - The branch name
  - The files with conflicts
  - What you already tried and where you are stuck

> [!NOTE]
> Prefer:
> - A **short Discord call** to walk through the conflict together, or
> - **In-person help** if you are in the office
> 
> This allows another developer to reproduce the conflict quickly and help without guesswork.

---

## 2. Verify Code Conventions

Before opening a Pull Request, you **must** verify that your changes comply with the Domits code conventions.

All code conventions are documented [here](https://github.com/domits1/Domits?tab=readme-ov-file#code-conventions).

After a while you are expected to review and follow these conventions **independently**.  
Otherwise reviewers will request changes based on the code you have written.

> [!TIP]
> Check the code conventions early while working. Over time, this becomes second nature and prevents unnecessary review feedback.

---

## 3. Create a Pull Request

> [!IMPORTANT]  
> Do **not** push directly to `acceptance`.  
> All changes must go through a Pull Request, otherwise you risk losing work or breaking the integration branch.

### Creating a PR via GitHub

1. Go to the **Domits GitHub repository**
2. Open the [Pull requests](https://github.com/domits1/Domits/pulls) tab
3. Click **New pull request**
   - Or use the **Compare & pull request** button if GitHub suggests it after pushing your branch
4. Configure the PR:
   - **Base branch:** `acceptance`
   - **Compare branch:** your working branch (`feature/*`, `docs/*`, `fix/*`, etc.)

Verify carefully that the base branch is `acceptance` before continuing.

### PR Title

The PR title must follow the **Conventional Commit** format.

This is mandatory and enforced as part of our Git branching and commit standards.  
Check the full specification [here](https://github.com/domits1/Domits/issues/2353).

Example:

```text
docs(backend): document local frontend-backend connection
```

### PR Template

When creating a PR, a template will automatically be shown.  
**All sections of this template must be filled in.**

The template includes:

- Issue linking (close or relate)
- Description of proposed changes
- Change type and size
- Refactoring clarification (if applicable)
- NPM package changes
- Security and convention checks
- Testing confirmation
- Branch cleanup preference

Incomplete or careless templates will slow down reviews.

> [!NOTE]
> Do not remove sections from the template without any good reason.

---

## 4. Code Review Process

### Required approvals

- A minimum of **2 human reviewers** must approve the PR
- In addition, **GitHub Copilot** may be added as an extra reviewer to assist with:
  - spotting potential issues
  - suggesting improvements
  - identifying common mistakes

> [!NOTE]
> Copilot is intended as **support only** and does **not** replace human code review or approval.
>
> If you do not have access to GitHub Copilot yet, you can obtain it for free via the [GitHub Student Developer Pack](https://education.github.com/pack)
>
> As a student, you can activate this pack.
> Many educational institutions are eligible, which means you get access to Copilot and other developer tools **at no cost during your studies**.

### Reviewer responsibilities

Reviewers must verify:

- Code correctness and clarity
- Compliance with code conventions
- All CI checks pass:
  - unit tests
  - build
  - pipeline checks

For a detailed guide on how to review a Pull Request at Domits, see the [PR Reviewer Onboarding documentation](https://github.com/domits1/Domits/blob/acceptance/docs/internal/onboarding/pr_reviewer_onboarding.md)

This document explains:

- How to review PRs effectively
- What to look for in code changes
- How to handle approvals, comments, and CI checks

### Handling review comments

- Read all comments carefully
- Apply requested changes when valid
- Respond to comments **inside the PR** to keep context
- Push updates to the same branch

---

## 5. CI Checks Must Pass

Before a PR can be merged:

- All CI checks must be **green**
- No failing tests
- No failing builds
- No blocked checks

If CI fails:

1. Fix the issue in your branch
2. Push a new commit
3. Confirm CI passes again

---

## 6. Merging to `acceptance`

Once all conditions are met:

- 2 approvals
- All review comments resolved
- CI fully green (except sonar cloud)

The PR can be merged **via GitHub** into `acceptance`.

---

## 7. Automatic Deployment to Acceptance

After merging into `acceptance`:

- Deployment to the acceptance environment starts automatically
- Deployment status can be monitored via [Amplify](https://eu-north-1.console.aws.amazon.com/amplify/home?region=eu-north-1#) in the [AWS Console](https://eu-north-1.console.aws.amazon.com/console/home?region=eu-north-1#)

Always verify:

- Deployment completes successfully
- Your changes are visible and working in [https://acceptance.domits.com/](https://acceptance.domits.com/)

If a deployment fails, notify the team immediately.

---

## 8. Exposing Your Backend Logic via API Gateway

After merging your PR and completing the automatic deployment to the acceptance environment, your backend logic is deployed to AWS **but is not automatically reachable via HTTP**.

### Important: What `npm run createLambda` does (and does not do)

At this point, your backend logic and Lambda function **should already be created** using the standard Domits workflow.

When you started by running the commando:

```bash
npm run createLambda
```

If not, first complete the steps described in [here](https://github.com/domits1/Domits/blob/acceptance/docs/internal/onboarding/backend_setup.md#create-a-lambda-function):

That document explains in detail how `npm run createLambda`:

- Creates the required folders in `/backend/functions`, `/backend/events`, and `/backend/test`
- Applies the Domits Lambda template
- Creates the Lambda function in AWS
- Creates a REST API in [API Gateway](https://eu-north-1.console.aws.amazon.com/apigateway/main/apis?region=eu-north-1) linked to the Lambda

---

However:

- **No API Gateway resources are created**
- **No HTTP methods (GET/POST/etc.) are created**
- **No usable endpoint exists yet**

The frontend cannot call your backend logic until you manually create and deploy the API Gateway resources.

---

### Creating an API Gateway Resource and Method

To expose your Lambda via HTTP:

1. Open the [AWS Console](https://eu-north-1.console.aws.amazon.com/console/home?region=eu-north-1)
2. Navigate to [API Gateway](https://eu-north-1.console.aws.amazon.com/apigateway/main/apis?region=eu-north-1)
3. Search for the REST API created for your Lambda
4. In the left sidebar, go to **Resources**

#### Step 1: Create a Resource

- Click **Create Resource**
- Enter a **Resource Name** (e.g. `bookings`, `properties`)
- Save the resource

#### Step 2: Create a Method

- Select the newly created resource
- Click **Create Method**
- Choose the HTTP method you need:
  - `GET`, `POST`, `PUT`, `DELETE`, etc.
- Confirm the method

#### Step 3: Configure the Method Integration

- Set **Integration type** to `Lambda Function`
- Enable **Lambda proxy integration**
- Select your Lambda function by name or ARN this can be fount in lambda itself
- Save the integration

---

### Enabling CORS (Required)

1. Select the created **resource**
2. Click **Enable CORS**
3. Enable CORS for:
   - Resource methods
   - Gateway responses `DEFAULT_4XX` and `DEFAULT_5XX`
4. In **Access-Control-Allow-Methods**, include:
   - Your HTTP method(s)
   - `OPTIONS`
5. Apply changes

---

### Deploy the API

After creating or updating API Gateway resources or methods, the changes are **not active** until the API is deployed.

1. Click **Deploy API**
2. In the **Stage** dropdown:
   - Select an existing stage (e.g. `acceptance`), **or**
   - Click **New stage** to create one
3. If creating a new stage:
   - Enter a clear stage name (e.g. `development`)
   - Optionally add a short description
4. Confirm deployment

Use a clear and consistent stage name so it is obvious which environment the endpoint belongs to.

> [!NOTE]  
> Creating a new stage is useful for local development, testing, or isolated changes without impacting the acceptance environment.

---

### Verify the Endpoint

Test using Postman.  
Check [CloudWatch](https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#) logs if issues occur.

---

### Responsibility

The developer is responsible for exposing and validating the endpoint.

---

## Further Learning & Growth

To understand the expected technical levels, responsibilities, and growth paths within Domits, refer to the [Programming Levels & Onboarding Guide](https://github.com/domits1/Domits/blob/acceptance/docs/internal/onboarding/programming_levels.md)

This document outlines:

- Expected skills per level (Level 1–3)
- Technical, cloud, and professional competencies
- Recommended learning resources and roadmaps
- Clean Code principles and best practices
- Insight into Domits’ tech stack and engineering structure

This guide is especially useful for interns and junior developers to understand **what is expected now** and **what to grow towards next**.

> [!NOTE]  
> This document is updated frequently. If information appears outdated, always refer to the Domits GitHub Wiki as the source of truth.
