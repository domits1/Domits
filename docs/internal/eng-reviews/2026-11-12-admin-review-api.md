# Approved review queue details: backend-only slice

Pull request: not assigned
Issue: not supplied
Branch: `feat/admin-review-dashboard`
Reviewed commit: `e70fcdff7`, with frontend changes removed in the working tree
Baseline: locally cached `origin/acceptance`
Result: no blocking backend findings

## Review scope and findings

Applied the architecture, code quality, tests and performance passes of
`.claude/skills/eng-review/SKILL.md` to the backend queue changes.
The earlier independent review also inspected these unchanged backend changes
and found no blocking backend defects. No reviewer disagreement remains.
The frontend findings and their fixes belong to the preserved frontend work,
not this backend-only slice.

No blocking findings.

## What already exists

- `ReviewService.getReviewApprovalQueue` authorizes callers before reads.
- Reuse `addModerationDetails` for pending and approved unpublished rows.
- Reuse the DTO whitelist; host IDs and private feedback remain excluded.
- Booking guest names require the booking guest to match the reviewer.
- Publication transitions, version checks and authorization are unchanged.

## Data flow

```text
Authenticated controller
          ▼
Allowlist + active approver role
          ▼
Unpublished queue (maximum 100 rows)
          ▼
Batched property, location, image and booking details
          ▼
Whitelisted review DTO
```

## Failure modes

| Failure | Coverage and handling |
|---|---|
| Missing property, image or booking | Detail tests cover nullable metadata and image fallback. |
| Booking belongs to another guest | Detail tests assert that the unrelated name is omitted. |
| Private fields in repository rows | DTO tests cover both statuses and exclude host IDs/private feedback. |
| Unauthorized caller | Existing backend role/allowlist tests deny access before storage reads. |
| Database lookup fails | Existing controller handling returns sanitized HTTP 500; no focused enrichment-failure test was added. |

## Performance

The 100-row queue limit is unchanged. Deduplicated parallel detail queries
avoid a per-review database query loop. Approved queues now pay the same
lookup cost as pending queues. Existing image reads can grow with image count;
no load-test claim is made.

## Not in scope

- All frontend helpers, components, styles, navigation, login and tests: next frontend branch.
- Pagination beyond 100 reviews: existing limitation, already documented in `2026-11-11-admin-review-list-api.md`.
- State-machine redesign and image query optimization: existing shared behavior.

## Verification

- The unchanged backend code passed all 16 ReviewSystem suites: 383 tests.
- Focused pending/approved queue detail tests rerun after the split.
- Final diff checked for whitespace errors and absence of frontend changes.
- No deployment performed.
