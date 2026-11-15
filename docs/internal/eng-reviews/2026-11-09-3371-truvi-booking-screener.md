# feat: screen pending bookings with Truvi and save the result #3371

Pull request: #3587
Issue: #3371
Reviewed commit: 41513837e
Result: 1 blocking finding (raised by Enes in review), fixed in this push. The review ran after the pull request was opened, not before; the three fixes were each reviewed as a staged diff before their commit.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js:3 (before) `const isRetryableError = (error) => !error \|\| error.status === null \|\| error.status === undefined \|\| error.status >= 500;` | A 401, 403, 408 or 429 was saved as `ERROR`, and `listBookingsToScreen` skips every booking with a row, so it was never screened again. A rate limit or a wrong key would leave bookings unscreened for good. Raised by Enes. | Fixed (commit f39f9af1f): these four statuses are retried like a 5xx. One test per status. |
| P2 (8/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js `#screen` | Every exception from the screening was saved as a permanent `ERROR`, so a bug in the mapper (a `TypeError`) would be saved for every booking. Raised by Enes. | Fixed (commit 90dbcb322): a `TypeError`, `ReferenceError` or `SyntaxError` is rethrown, so it lands in `summary.errors`, the run fails and the booking is tried again. A refusal of the mapper (a plain `Error`) is still saved. |
| P3 (8/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js `#buildInput` `now: new Date()` | The Truvi request used its own clock instead of the `now` of the run. Raised by Enes. | Fixed (commit 41513837e): the run passes its `now`. |
| P3 (7/10) | backend/functions/Truvi-Integration/data/truviBookingRepository.js:70 `ORDER BY b.arrivaldate ASC LIMIT $3` | A booking that keeps getting a retryable answer stays at the front of the list, so ten of them block every later booking. A wrong key (401) now also keeps the whole batch waiting. Raised by Enes. | Accepted for this pull request: the schedule is off and the Lambda has `.deployment-disabled`. The attempt counter of #3786 covers the modify and cancel runs; the screening run has no row to count on yet. Planned before the schedule is enabled: save a `RETRY` row with an attempt count for these bookings, so they move to the back and stop after a limit. |
| P3 (6/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js | A 401 or 403 now only shows up as `retryLater` in the summary; the run does not fail on it. | Accepted: `retryLater` in the run summary is the signal for now. A check that it stays 0 on the first runs goes into the enablement steps of the schedule doc (#3602) when the stack moves up. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| screening run | Truvi rate limit (429) or timeout (408) | yes | not saved, tried again next run | yes, `retryLater` in the summary |
| screening run | wrong or rotated subscription key (401, 403) | yes | not saved, tried again next run | yes, `retryLater` for the whole batch |
| screening run | a bug in the mapper throws a `TypeError` | yes | not saved, the run fails | yes, the run fails in CloudWatch |
| screening run | the mapper refuses the booking data | yes | saved as `ERROR` with the reason | yes, the row |

## What already exists

- The retry path for a 5xx and a timeout was already there; the four statuses join it instead of a new path.
- `summary.errors` and the failing run from the handler (#3602) are the existing way to make a problem visible.

## Not in scope

- An attempt limit for bookings that keep getting a retryable answer: planned before the schedule is enabled, see the P3 above.
- Later pull requests in the stack (#3602 to #3786) still have the old screener; they get these fixes when `acceptance` is merged into them as they move up.
