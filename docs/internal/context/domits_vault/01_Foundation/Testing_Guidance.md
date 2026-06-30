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
  - repo: docs/internal/onboarding/testing_guidelines.md
related:
  - [[Delivery_Workflow]]
  - [[PR_Workflow]]
  - [[PR_Review_Workflow]]
---
# Testing Guidance

- Last synced: 2026-06-03
- Scope: durable Domits testing baseline for authors and reviewers.

## Why We Test

- Tests reduce production regressions.
- Tests make refactoring safer.
- Tests clarify intended behavior for future developers and AI assistants.

## When Tests Matter Most

- Business logic
- Branching behavior
- Validation rules
- Code that is likely to be reused or modified
- Code whose failure would be expensive to discover only in acceptance or production

## When Dedicated Tests May Be Unnecessary

- Very small trivial plumbing
- Behavior already covered clearly by another stronger test
- Code whose only meaningful verification is already happening at a more appropriate level

## What Good Tests Look Like

- One clear responsibility per test
- Clear expected outcome
- Explicit assertions
- External dependencies isolated where practical
- Fast enough to run regularly
- Easy for another developer to understand later

## What Weak Tests Look Like

- No meaningful assertions
- Unclear purpose
- Too many concerns in one test
- Passing even when the real behavior is broken

## Practical Review Rule

- Prefer fewer strong tests over many vague tests.
- A test should make the code safer, not just make the diff larger.

## Read Next

- Use [[PR_Workflow]] when preparing a change for review.
- Use [[PR_Review_Workflow]] when judging the adequacy of a test suite in a PR.
