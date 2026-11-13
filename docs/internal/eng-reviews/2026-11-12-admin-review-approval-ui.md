# Admin review approval components: engineering review

Branch: `feat/admin-review-approval-ui`; PR base: `feat/admin-review-dashboard-ui`.
Reviewed: `e4e627fbd` plus review documentation and CSS redistribution; PR/issue numbers not supplied.
Result: no blocking findings. Review date: 2026-11-12.

## Findings and decisions

No blocking findings. Completed architecture, code quality, tests and performance passes of `.claude/skills/eng-review/SKILL.md`.
An independent reviewer inspected the component diff and agreed; no disagreements remain.
Presentation components receive callbacks/state through props; they introduce no network or authorization boundary.
Row keyboard handling checks `event.target === event.currentTarget` (`ReviewApprovalTable.js:21`) so nested controls do not activate the row.
Publication requires approved and unpublished state (`ReviewApprovalTable.js:78`, `ReviewApprovalDetails.js:101`).
Review text is rendered through escaped React expressions. Rendering is linear in supplied rows, with five stars per row and lazy table thumbnails.

## What already exists

Reuse `RatingStars`, `normalizeImageUrl`, formatting helpers, and the server's existing moderation authorization.

## Failure modes

| Path / failure | Tests | Handling and visible result |
|---|---|---|
| Missing property, guest or image | Placeholder paths inspected; no dedicated component test here | Fallback labels, initials and shared image placeholder. |
| Row selection or nested keyboard input | Final-stack page tests | Target guard prevents duplicate row selection; selected details are shown. |
| Repeated approval/publication click | Final-stack page tests | Supplied busy state disables actions; parent hook suppresses duplicate requests. |
| Approval/publication conflict or outage | Final-stack page/API tests | Parent owns the error message/retry; component does not swallow errors. |
| Navigation to restricted content | Existing backend authorization tests | Server denies access; navigation is not permission enforcement. |

## Data flow

Parent queue state ▶ table/details/navigation ▶ callback ▶ parent hook/API ▶ server authorization.

## Not in scope

- Remaining CSS and responsive rules: styles branch, completed before components are mounted by integration.
- Page integration and dedicated component/page tests: later branches; this slice is dormant until integration.
- Browser, mobile, tablet and desktop screenshots: not performed; required before claiming visual readiness.

## Validation

The exact complete frontend previously passed 7 suites / 105 tests; this is integration evidence, not an isolated-branch test claim.
The inherited API/formatting slice passed 46 tests. Static inspection and final whitespace checks cover this component review.
Approved CSS redistribution preserves the final stack's application files exactly; no behavior or final styles are removed.
