# fix(propertyhandler,hostdashboard): make the listing-review email notice robust (#3302)

Pull request: #3904
Issue: #3302
Reviewed commit: d282e9e7a
Result: 6 findings across 4 commits: 4 fixed, 2 deferred as follow-ups

Four commits on `fix/3302-email-notify-robustness`:

1. `370f5bd4e` time-limits the email notice.
2. `4e5169383` corrects the comment that justifies the time limit.
3. `2b524f851` makes the failure log a structured event.
4. `d282e9e7a` warns when review history entries are dropped.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 | `listingReviewNotifier.js`, `notifyDecision` | `reviewPendingProperty` awaits `notifyDecision`, so a Cognito or Lambda call that never settles holds the approve or reject response until API Gateway gives up. The existing `try/catch` handles rejections, not hangs. | Fixed in `370f5bd4e`. The host lookup and the invoke share one `withinTimeLimit` budget of 3000 ms. On expiry the existing catch logs code `NOTIFICATION_TIMEOUT` and the review still succeeds. |
| P3 | `listingReviewNotifier.js`, `NOTIFICATION_TIMEOUT_MS` | The comment said an `AdminGetUser` plus an async invoke "normally take well under a second", next to a value that looked justified. There is no latency data behind 3000 ms. It copies `WEBSITE_PLAN_READ_TIMEOUT_MS` as precedent only. | Fixed in `4e5169383`. The comment now says the figure is an assumption, not measured. |
| P3 | `listingReviewNotifier.js`, the catch block | The failure was logged as a message plus an object, which is not one line CloudWatch can filter on. | Fixed in `2b524f851`. One JSON line: `event: LISTING_REVIEW_EMAIL_FAILED`, `propertyId`, `outcome`, `code`. Never the host's email, the actor or the reason. The existing privacy test passes unchanged. |
| P3 | `reviewHistoryFormat.js`, `buildReviewHistoryRows` | A malformed entry, or a history field that is not a list, was dropped silently. | Fixed in `d282e9e7a`. A `console.warn` reports the count of dropped entries, or that the history is not a list. Only counts: entries carry `actorId` and `reason`, which never appear in the warning text. |
| P4 | `ReviewHistory.jsx:6` | `buildReviewHistoryRows(history, hostId)` runs in the render body with no memoisation, so every re-render repeats the warning. | Deferred as a component-level change, noted in the PR description. The warning is a count, so a repeat is noise and not a leak. |
| P3 | CloudWatch, outside this repo | Nothing alerts on `LISTING_REVIEW_EMAIL_FAILED` yet. The event is now filterable, but no one is told when it fires. | Open follow-up. A metric filter and an alarm on that event pattern must be set up separately by whoever has CloudWatch access. |

## Decisions

- Budget: one 3000 ms budget for the host lookup and the invoke together, not one each. The value copies `WEBSITE_PLAN_READ_TIMEOUT_MS`, the only comparable single dependent read in that function. Nothing documents `AdminGetUser` latency, and the PropertyHandler Lambda timeout is unconfirmed. The notice is best effort, so a longer wait only adds latency. 3000 ms is far below API Gateway's 29 s limit.
- Abandon, not cancel: the timeout stops waiting for the call. It does not cancel it, so an email can still arrive after a `NOTIFICATION_TIMEOUT` log. No retries exist, so it cannot duplicate.
- Failure stays swallowed: a timeout takes the same path as any other notice failure. It is logged and the approve or reject succeeds.
- Log shape: the structured line carries ids and a code only.

## Verification

The suite and mutation figures for commits 2 to 4 were supplied by the author of the commits when this record was written. Commit 1's come from its commit message.

### `370f5bd4e` time limit

- Tests added: hung Cognito, hung invoke, shared budget across both, no timeout log on the happy path. The error spy is now restored after each test, because call counts leaked between tests.
- Full backend suite: 14 suites and 20 tests fail, identical by name on clean HEAD and with this change (verified by stashing and re-running). The causes are local environment: missing `@aws-sdk/client-cloudwatch` and `fast-xml-parser`, file-content comparisons, and `end-to-end.test.js` needing a live database.
- Mutation check: no summary was provided for this commit when this record was written.

### `4e5169383` comment fix

- Full backend suite, staged: 435 suites, 6024 tests, 14 failed suites and 20 failed tests, identical to the HEAD baseline.
- Mutation check: none. The change is a comment, with no behavior change.

### `2b524f851` structured log

- Mutation check: 10 valid mutants, all killed. They were: drop the `event` field, drop `propertyId`, drop `outcome`, drop `code`, a different event name, the old two-argument log shape, leak the reason into the log, leak `hostId` into the log, leak `error.message` as the code, and `console.warn` instead of `console.error`.
- Full backend suite: the first run showed 7 new failures. They traced to an expired AWS SSO session, not to the code. Restoring both files to HEAD content reproduced the identical 7 failures. After `aws sso login`: 435 suites, 6026 tests, 14 failed suites and 20 failed tests, the same failing set, 0 new.

### `d282e9e7a` history warning

- Mutation check: 11 valid mutants, all killed. They were: drop the non-array warning, drop the dropped-count warning, the threshold `> 0` becomes `> 1`, always warn even when clean, count `history.length` instead of the dropped count, an extra warn per dropped entry inside `toRow`, leak entries into the warning text, `console.error` instead of `console.warn`, a non-array returns `undefined` instead of `[]`, wrong singular and plural, and warn on an empty array.
- Full web suite: 272 suites, 3556 tests, 2 failed suites and 9 failed tests. The baseline, with the two new files restored to HEAD, was 271 suites, 3552 tests, 1 failed suite and 9 failed tests. The one extra failing suite, `HostSettingsPrivacySecurity.test.jsx`, was a transient Windows jest-transform-cache `EPERM` rename error. It passed 7 of 7 when run alone. No new real test failures.

## Not in scope

- A CloudWatch metric filter and alarm for `LISTING_REVIEW_EMAIL_FAILED`. It lives outside this repo and needs whoever has CloudWatch access.
- Memoising the history rows in `ReviewHistory.jsx`, so the warning fires once per history and not once per render. A component-level change, deferred.
- Cancelling the abandoned call, a retry, or an outbox. The notice stays best effort, as decided in the original notification work.
- Measuring real `AdminGetUser` and invoke latency to replace the 3000 ms assumption.
