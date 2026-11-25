# docs(standards): user-facing errors say what happened and what to do next

Pull request: (to be opened)
Issue: none. Follow-up to the Engineers thread of 25 Nov: a host saw "Network error: You must be logged in." while logged in, with no way forward. The thread asked for errors that say what to do next, and for tests that prevent this behaviour.
Reviewed: staged diff on `docs/user-facing-error-rule`, on top of `origin/acceptance`
Result: no blocking findings

## What changed

- `docs/internal/context/domits_vault/01_Foundation/Clean_Code_Standards.md`, section "Error Handling / Testing", one new line under "Handle failure paths intentionally…":
  `Write every user-facing error so it tells the user what happened and what they can do next.`
- `CLAUDE.md`, "Code conventions", the same sentence under "Handle failure paths intentionally. Do not swallow errors." CLAUDE.md repeats the Foundation rules for the AI tools; without it the two would drift.

The existing line covers the developer side (no swallowed errors). The new line covers what the user sees.

## Why

The incident had three messages, none naming a next step:

| Where | Message | Cause |
|---|---|---|
| `frontend/web/src/features/hostonboarding/services/SubmitAccommodation.js:221` | `Network error: You must be logged in.` | No token sent; labelled a network error |
| `frontend/web/src/features/hostdashboard/hooks/useHostDashboardData.js:292` | `You must be signed in to view your dashboard.` | `getAccessToken()` returned null |
| `backend/functions/PropertyHandler/auth/authManager.js:38` | `You must be logged in.` | Missing token |

Root cause of the incident: `frontend/web/src/services/getAccessToken.js:11` returns null when localStorage holds Cognito tokens for more than one account. Clearing the site data fixed it for the host.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `CLAUDE.md:172`, `- Handle failure paths intentionally. Do not swallow errors.` | CLAUDE.md copies the Foundation rules; without the new line the two documents drift. | Fixed: the same sentence is added under it. |
| Checked | `docs/internal/standards/code_conventions.md` | The long-form conventions have no failure-path rule, so there is nothing there to keep in step. | No change |

## Failure modes

A rule only guards new code that a reviewer checks against it.

| Failure | Test | Handling | Visible |
|---|---|---|---|
| A new screen shows a raw backend or technical message | No | Review against this rule | Only if a reviewer notices |
| Existing unclear messages | No | Fixed when touched | Yes, as today |

The lasting protection is a shared helper that turns 401/403/5xx/network failures into fixed, actionable messages, with tests. See Not in scope.

## Not in scope

- The shared error helper and its tests: code, with an owner to agree at stand-up.
- The `getAccessToken` fix for more than one stored login: its own PR with a test for this case.
- Rewriting existing messages: done as the code is touched.
- A PR template checkbox: the checklist is long enough; the rule lives in the standards.

## What already exists

- `Clean_Code_Standards.md:58`, "Handle failure paths intentionally instead of swallowing errors or returning vague junk."
- The Channex Distribution tab backend already returns `DISTRIBUTION_*` codes that the frontend maps to a message per code.

## Manual check

None needed: documentation only.
