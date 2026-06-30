---
type: runbook
status: active
area: developer-workflow
owner: engineering
created: 2026-06-03
updated: 2026-06-03
confidence: high
source:
  - repo: docs/internal/onboarding/pr_reviewer_onboarding.md
  - repo: docs/internal/onboarding/development_workflow.md
related:
  - [[Delivery_Workflow]]
  - [[PR_Workflow]]
  - [[Testing_Guidance]]
---
# PR Review Workflow

- Last synced: 2026-06-03
- Scope: practical review baseline for Domits pull requests.

## Review Order

1. Read the PR title, template, and proposed changes.
2. Check whether the PR size is still reviewable.
3. Review the changed files for correctness, conventions, and clarity.
4. Confirm CI is green.
5. Confirm the branch is not stale against `acceptance`.
6. Approve or request changes with clear reasoning.

## Review Baseline

- Prefer PRs that are small enough to review safely.
- The reviewer onboarding doc uses a guideline of ideally under 500 changed lines and definitely under 1000, but correctness matters more than the number alone.
- Check for code-convention violations, risky logic, unnecessary comments, and unclear implementation choices.
- Use comments when they communicate a real issue, question, or improvement, not as decoration.

## CI And Branch Freshness

- Do not ignore failing CI.
- If the branch is behind `acceptance`, ask for it to be updated before merge.
- Review is not complete until the code and the checks both look safe.

## Decision Rule

- Approve when the code is understandable, correct, convention-aligned, and CI-clean.
- Request changes when there is a real safety, correctness, maintainability, or workflow problem.

## Read Next

- Use [[Testing_Guidance]] if the review question is mainly about test quality.
- Use [[PR_Workflow]] if you need the author-side view of the same lifecycle.
