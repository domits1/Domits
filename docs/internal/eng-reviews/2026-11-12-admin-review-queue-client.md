# Admin review queue client: feedback review

PR: [#3886](https://github.com/domits1/Domits/pull/3886)
Branch: `feat/admin-review-dashboard-ui`
Related scenario issue: [#3208](https://github.com/domits1/Domits/issues/3208)
Parent capability: [#90](https://github.com/domits1/Domits/issues/90)
Baseline: `origin/acceptance` at `2efb40143`.
Scope: check the supplied review feedback and implement local corrections.

## Findings and decisions

- Hook behavior lacked direct tests. Added mocked API tests for initial loading,
  stale loads after a scope switch, 401/403 denial versus other failures, retry,
  duplicate actions before re-render, queue removal on approval/publication,
  retained rows and released guards after action failure. Failure/retry tests use
  pending-approval for approve and approved for publish; successful retries remove
  the review from the corresponding queue and clear the in-flight guard.
- Empty and whitespace timestamps became the epoch. They now return Unknown date;
  numeric zero remains valid. Regression tests cover both cases.
- Removed unused verification/status helpers and route constants. Future UI slices
  should introduce these only with consumers. Simplified the pending queue branch
  to call the existing scoped loader directly.
- API helpers and their original tests already landed in #3882. This branch adds
  hook state management and formatting, reusing those helpers. It adds no endpoints.

## Architecture and failure modes

Future page -> queue hook -> existing review API -> authenticated backend.
The in-flight ref blocks duplicate requests synchronously. Loading effects ignore
responses after cleanup. Authorization remains enforced by the backend; denied
loads and failed loads have distinct states. Action errors preserve the row and
produce an error notice. The new tests verify these behaviors.
Queue updates filter/map existing bounded responses; no polling was introduced.

## Integration risk and merge order

`git merge-tree --write-tree HEAD origin/feat/admin-review-flagging-ui` reports
modify/delete conflicts in ReviewApprovalDetails.js, ReviewApproval.module.css,
ReviewApprovalPage.test.js and ReviewApprovalPage.js. Shared queue/format files
also exist on that branch. A clean independent merge cannot be claimed.

The user confirmed that this PR (#3886) will merge before #3852. After it lands,
rebase #3852 onto acceptance and trim its overlapping queue/format changes.
Resolve shared files against the dashboard integration available at that point
and run combined page/flagging tests. The current merge simulation still reports
conflicts; merge order does not resolve them automatically. No other PR was closed.

Follow-up verification against refreshed origin/acceptance at 05ab73836 confirms
that #3852 still has modify/delete conflicts in ReviewApprovalPage.js and its test,
as well as ReviewApprovalDetails.js, ReviewApproval.module.css,
useReviewApprovalQueue.js and reviewApprovalFormat.js. The rebase remains deferred
until this PR lands; this client-test correction does not resolve those conflicts.

## Verification

- Three targeted Jest suites passed: 61 tests, including 9 hook tests.
- The existing API suite was rerun as regression coverage, not added by this PR.
- `git diff --check` passed.
- Browser checks, backend changes and deployment are outside this client slice.

## Suggested PR description correction

Add an admin review queue hook that reuses the API helpers merged in #3882.
Track loading, denied and failed states; guard duplicate moderation actions;
update queue rows after successful actions; and provide formatting/search helpers.
Add mocked hook tests and formatting edge-case tests. Related issue: #3208;
parent capability: #90. Review record: this file. This PR merges before #3852, which must then be rebased and its overlap reconciled. No new API helpers or backend changes are included.
