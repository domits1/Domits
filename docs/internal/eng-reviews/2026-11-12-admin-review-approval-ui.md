# Admin review approval components: engineering review

Branch: `feat/admin-review-approval-ui`; current PR base: `acceptance`.
PR: #3887. Related scenario: #3208; parent capability: #90.
The original review below used `feat/admin-review-dashboard-ui` as its base.
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

## Feedback follow-up — 2026-11-13

The original no-blocker conclusion did not account for dependencies removed by
#3886. This follow-up verifies and fixes the supplied feedback; it does not claim
a new independent review or browser validation.

- Restored `getReviewStatusLabel` and `isVerifiedStatus`, which table/details
  consumers still import, and the route constants used by navigation.
- Added a component render suite importing the real table, details, navigation,
  formatting and route modules. It covers escaped review content, route matching,
  keyboard handling for nested controls, and publication eligibility.
- Removed `aria-selected` from the native table row. Its checkbox continues to
  expose selection. Invalid or absent ratings show "Rating unavailable" in both
  the table and details, with no fabricated score or stars.
- Validation: 74 tests passed across component, formatting, queue-hook and API
  suites. `git diff --check` passed. Browser/responsive evidence remains deferred.
- Refreshed `origin/acceptance` is `284adbf82` (#3886 merged), and the flagging head
  is `0af6b8d33`. Read-only `git merge-tree --write-tree` simulations of committed
  HEAD (`303f2e491`) against each branch, and acceptance against flagging, completed
  without conflicts. These simulations exclude this uncommitted follow-up and do
  not guarantee future merge results. The older reported conflict list was not
  reproduced at these revisions.
- The existing decision in #3886 assigns the post-merge rebase and overlap
  reconciliation to #3852. No branch history was rewritten or coordination
  message sent during this follow-up.
- PR #3887's remote description still contains the old base, empty issue field,
  "pending" record and contradictory review statement. Proposed title:
  `feat(reviews): add admin approval dashboard components (#3208)`.
  Its description should name acceptance, relate #3208/#90, link this record,
  describe the render coverage, and retain unchecked browser evidence items.
