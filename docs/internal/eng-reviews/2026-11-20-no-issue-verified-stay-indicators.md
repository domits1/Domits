# Verified stay indicators: current engineering review

PR: https://github.com/domits1/Domits/pull/3487
Related issue: #90
Baseline: `acceptance`; local comparison uses `origin/acceptance`.
Updated: 2026-11-27. This replaces the previous booking-dependent review notes.

## Findings and decisions

| Finding | Resolution |
|---|---|
| Later cancellation/refund could hide a published review | Creation and validated submission persist VERIFIED_STAY. Publication and public reads retain that evidence without rechecking mutable booking status. |
| Legacy reviews lack stored evidence | Manual backfill is required before or at merge deployment, before public traffic resumes. See the release runbook. |
| Unbounded migration can exceed DSQL transaction limits | SQL and JS update at most 500 rows per statement. JS disables migration-wide transactions, rejects active encompassing transactions, and repeats until exhausted. SQL batches must be committed separately. |
| Already cancelled/refunded bookings cannot establish historical evidence | Read-only preflight counts eligible rows and excluded published reviews by booking status, including missing bookings and other eligibility failures. Recover trusted historical evidence or record an explicit release-owner exclusion decision before release. No reviews are deleted. |
| Host/public scores and counts use different verification eligibility | Host performance, history, category ratings, trends and overall score now require VERIFIED_STAY. Ownership, time-range and property-status rules remain endpoint-specific. |
| Old PR description used the wrong baseline and obsolete behavior | Description must explain persisted evidence, the manual migration gate and the acceptance baseline. |

## Behavior and authorization

A review must match its reservation's guest, host and property, cannot be a self-review,
and requires a paid/confirmed reservation after checkout before evidence is persisted.
Existing authorization, moderation, publication and optimistic version checks remain.
A later cancellation or refund does not invalidate persisted evidence. Public review
count, score and pagination all use the stored status; the badge requires strict
backend `verified: true`. Booking/private feedback fields remain excluded publicly.

Backfill preserves VERIFIED_STAY, includes eligible legacy statuses (including null),
and advances updated_at to prevent stale writes. Completed batches are idempotent.
It intentionally does not manufacture historical evidence for ineligible bookings.

## Migration and release checks

Follow [persist_verified_stays_runbook.md](../tools/persist_verified_stays_runbook.md).
Save preflight counts before merge. Keep public traffic held if backend deployment
precedes backfill; restore it only after eligible count is zero and exclusions have
been reconciled or explicitly accepted. Migration execution is manual.

## Validation

Repository tests cover generated host/public SQL, lifecycle verification, migration
batch repetition and rejection of enclosing transactions. UI tests cover strict
badge visibility. Record current execution results and visual evidence below.

Live DSQL preflight counts, query execution/plans and the acceptance cancellation/
refund end-to-end flow remain unexecuted. Source tests do not establish those results.

## Current execution results

- Backend ReviewSystem: 19 suites, 436 tests passed.
- Frontend PublicReviews, ReviewsSection and VerifiedStayIndicator: 3 suites, 19 tests passed.
- git diff --check passed.
- Badge tooltip text is asserted by the component test.
- Screenshots and mobile/tablet/desktop visual checks remain pending: the browser
  could not connect to the local component preview, and direct local-file navigation
  was blocked by browser security policy. No visual or responsiveness pass is claimed.
- Live database counts and cancellation/refund integration checks remain pending.
