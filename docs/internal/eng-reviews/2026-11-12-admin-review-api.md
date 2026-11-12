# Admin review API helpers and approved queue details

Pull request: not assigned
Issue: not supplied
Branch: `feat/admin-review-api`
Reviewed commit: `f021647be`, plus the working-tree fixes described below
Baseline: locally cached `origin/acceptance`; no remote fetch performed
Result: 2 blocking findings, both fixed in the working tree; no remaining blocking findings.

## Review method

Applied `.claude/skills/eng-review/SKILL.md` to the current branch diff, in order: architecture, code quality, tests, performance. The target was established by the branch-splitting and PR discussion. An independent reviewer inspected the diff and then re-reviewed the fixes. Both reviewers agree on the findings and their resolution; no disagreement remains. The user approved each fix separately.

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `frontend/web/src/features/review/services/reviewAPI.js:35` in reviewed commit | `return Array.isArray(payload) ? payload : [];` silently converts malformed successful responses into an empty queue. The access probe could then report success without a valid queue response. | Fixed: reject non-array payloads with an explicit error. Regression tests cover empty bodies, JSON null, objects, changed response shapes, invalid JSON, unreadable bodies, valid empty arrays, and access probes receiving malformed responses. Server authorization remains authoritative. |
| P2 (10/10) | `frontend/web/src/features/review/tests/reviewApprovalAPI.test.js:1` in reviewed commit; `reviewAPI.js:50-56,204-211` | The test imports omitted the two new helpers: `hasReviewApprovalAccess` and `submitReviewForApproval`. The former contains `if (error?.status === 401 || error?.status === 403) return false; return null;`; the latter posts to `/publish` and translates errors. Their success and failure branches lacked direct coverage. | Fixed: add access success, 401/403 denial, 500/503 outage, network and malformed-response tests; add authenticated submission, encoded ID, pending result, 400/401/403/409/500 messages and network-failure tests. Also cover the generic approved queue scope. |

Final locations: payload validation at `reviewAPI.js:35-38`; malformed-response tests at `reviewApprovalAPI.test.js:13-25`; access tests at lines 35-59; submission tests at lines 61-87.

## Architecture

Component-level request flow:

```text
Future approval UI / guest review UI
                  ▼
reviewAPI helpers + existing token/response utilities
                  ▼
ReviewSystem controller: authenticate and map scope/action
                  ▼
ReviewService: allowlist + active role, DTO whitelist, state rules
                  ▼
ReviewRepository: bounded queue + batched moderation details
                  ▼
Review / Property / Location / Image / Variant / Booking tables
```

`getReviewApprovalQueue` authorizes before reading data (`reviewService.js:301-304`). Both queue statuses now reuse the existing moderation DTO, which excludes `host_id` and `private_feedback`. Booking names are returned only when the booking guest matches the reviewer. The client access helper controls presentation only; it cannot grant server permissions.

Existing state machine (unchanged by this PR):

```text
DRAFT ▼ guest POST /publish ▼ PENDING_APPROVAL
      ▼ approver POST /approve + updated_at ▼ APPROVED
      ▼ approver POST /publish ▼ PUBLISHED
```

The same `/publish` endpoint serves guest submission and final approver publication. Server state and authorization distinguish those actions. Approval still checks the version and rechecks the approver role inside the transaction.

## What already exists

- Reuse `requestReview`, `getIdToken`, `parseResponse` and guest error translation rather than introducing another transport layer.
- Reuse `addModerationDetails` and the explicit review DTO whitelist for approved queue rows.
- Reuse existing controller authorization, transaction/version checks, publication rules and their backend tests.
- No endpoints, migrations, dependencies, configuration or UI components are introduced by this API slice.

## Failure modes

| Path | Realistic failure | Test coverage | Handling and caller-visible result |
|---|---|---|---|
| Admin queue load | Server returns an empty, invalid or changed payload with HTTP 200 | Added malformed/unreadable response tests | Explicit error instead of an empty queue; a valid `[]` is still accepted. |
| Admin queue load | Caller lacks access | Existing API 403 test and backend queue role/allowlist tests | Reject with message and HTTP status for the UI to display. |
| Access probe | Expired session or forbidden caller | Added 401/403 tests | Returns false; server still enforces authorization. |
| Access probe | Network outage, server failure or malformed success | Added network, 500/503 and malformed payload tests | Returns null, meaning unknown rather than denied. UI presentation is deferred. |
| Approval | Another moderator changes the review after loading | Frontend 409 test; backend version/transaction tests | Preserves conflict status and reload message; stale transition is rejected. |
| Final publication | Role revoked or server rejects publication | Frontend publication refusal and backend role recheck/transaction tests | Error reaches caller; existing backend transaction protects publication state. |
| Guest submission | Expired identity, wrong owner, invalid draft, conflict or outage | Added submission error mapping and network tests; existing backend submission tests | Rejects with guest-facing message or propagates network error. Existing conflict copy is reused. |
| Queue enrichment | Property, image or reviewer-owned booking is missing | Backend queue detail tests | Nullable metadata, thumbnail/web fallback; no unrelated guest name or private feedback disclosure. |
| Queue enrichment | Related database read fails | Related lookup failure is not directly injected by the queue detail suite; controller server-error handling is tested elsewhere | Promise rejection propagates to the existing sanitized HTTP 500 response and client error. A focused database-failure test remains a nonblocking coverage opportunity. |

There is no identified critical gap with neither handling nor a visible failure. UI display itself is outside this branch and was not tested.

## Performance

- Queue reads retain `take: 100` (`reviewRepository.js:256`). Detail lookups are deduplicated and batched with `Promise.all` (line 274), with no new per-review database query loop.
- Approved rows now incur the same enrichment cost as pending rows. Image selection still reads all READY image metadata for the selected properties; the queue cap does not bound image count. This pre-existing implementation is reused, with no load-test claim.
- The access probe fetches a full pending queue. It currently has no consumer on this branch; avoid polling it frequently in the UI. A lightweight access endpoint can be considered when usage warrants it.

## Not in scope

- UI, navigation, login changes and responsive evidence: separate branch slices.
- State-machine redesign or separation-of-duties changes: existing authorization policy is preserved.
- Cursor pagination: the pre-existing 100-row limit is already recorded in `2026-11-11-admin-review-list-api.md`; this change only enriches existing approved rows.
- A dedicated access endpoint: context is future navigation gating; options were a new endpoint or reuse of the authorized queue. Keep reuse for this API slice, accepting its extra read cost and tri-state contract. Revisit when a consumer is integrated.
- Image-query optimization, end-to-end deployment and production load testing: shared existing behavior and infrastructure are beyond this bounded API diff.

## Verification

- Backend: `npm test -- --runInBand test/ReviewSystem` — 16 suites, 383 tests passed.
- Frontend: expanded API suite plus `ReviewPage.test.js` and `hostResponseAPI.test.js` — 3 suites, 79 tests passed.
- `git diff --check` passed with the final source and test changes. The new Markdown record was also checked for trailing whitespace.
- No production deployment or browser/UI validation performed.
