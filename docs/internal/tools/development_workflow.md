# Development Workflow: From Finished Work to Acceptance Deployment

This document explains **what to do after you finish your work** (feature, fix, or documentation) and how it safely reaches the **acceptance environment**.

This workflow is mandatory. Skipping steps will result in blocked PRs, failed reviews, or broken deployments.

---

## 1. Verify Code Conventions

Before opening a Pull Request, you **must** verify that your changes comply with the Domits code conventions.

All code conventions are documented [here](https://github.com/domits1/Domits?tab=readme-ov-file#code-conventions).

After a while you are expected to review and follow these conventions **independently**.  
Otherwise reviewers will request changes based on the code you have written.

> [!TIP]
> Check the code conventions early while working. Over time, this becomes second nature and prevents unnecessary review feedback.

---

## 2. Sync Your Branch With `acceptance`

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
This helps detect integration issues, or broken functionality early, before problems reach production or block others.

---

## 3. Create a Pull Request

> [!Important]
> Do **not** push directly to `acceptance`, all changes go through a Pull Request otherwise you will lose your work

### PR configuration
- **Base branch:** `acceptance`
- **Compare branch:** your working branch (`feature/*`, `docs/*`, `fix/*`, etc.)

### PR title
Must follow the Conventional Commit format, for example:

```
docs(backend): document local frontend-backend connection
```

### PR template
Fill in **all sections** of the PR template:
- What was changed
- Why it was changed
- How it was tested
- Relevant notes or risks

Incomplete templates slow down or block reviews.

---

## 4. Code Review Process

### Required approvals
- A minimum of **2 reviewers** must approve the PR

### Reviewer responsibilities
Reviewers must verify:
- Code correctness and clarity
- Compliance with code conventions
- All CI checks pass:
  - unit tests
  - build
  - pipeline checks

### Handling review comments
- Read all comments carefully
- Apply requested changes when valid
- Respond to comments **inside the PR** to keep context
- Push updates to the same branch

Ignoring comments or responding outside the PR is not acceptable.

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
- CI fully green

➡️ The PR can be merged **via GitHub** into `acceptance`.

You do **not** perform this merge locally.

---

## 7. Automatic Deployment to Acceptance

After merging into `acceptance`:
- Deployment to the acceptance environment starts automatically
- Deployment status can be monitored via the AWS Console (e.g. Amplify)

Always verify:
- Deployment completes successfully
- Your changes are visible and working in acceptance

If a deployment fails, notify the team immediately.

---

## Final Checklist

Before merging, confirm:

- [ ] Code follows Domits code conventions
- [ ] Branch is rebased on `acceptance`
- [ ] PR base branch is `acceptance`
- [ ] PR title follows Conventional Commits
- [ ] PR template is fully filled in
- [ ] 2 reviewers approved
- [ ] All review comments resolved
- [ ] CI checks are green
- [ ] Merge performed via GitHub
- [ ] Deployment to acceptance verified
