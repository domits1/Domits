# feat: retry a Truvi screening at most five times #3371

Pull request: not opened yet (branch `feature/3371-truvi-retry-limit`, on top of #3786 with `acceptance` merged in; it is opened once #3786 is merged)
Issue: #3371
Reviewed commit: 3af1e34d0
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

The two points from the reviews of #3587 that had to be done before the schedule is enabled: Enes's retry limit for the screening run (the checkbox in the enablement steps of #3602) and Rakib's `TruviInputError`.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js `MAX_SCREENING_TRIES = 5` | With the 15-minute schedule, five tries take about an hour and a quarter. A Truvi outage longer than that gives the bookings of that time an `ERROR`. | Accepted: giving up fails the run once, so it shows in CloudWatch, and deleting the `ERROR` row makes the next run screen the booking again (Rollback in the schedule doc). |
| P4 (6/10) | backend/functions/Truvi-Integration/data/truviBookingRepository.js `listBookingsToScreen` | A `RETRY` row of a booking whose arrival has passed stays in the table; the query no longer lists it. | Accepted: nothing acts on it, and it shows the booking was never screened. |
| P4 (5/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js `KEY_STATUSES` | A wrong key (401, 403) is not saved or counted, so every run retries the whole batch until the key is fixed. | Intended: counting it would give every booking a permanent `ERROR` after five runs, which Enes warned about on #3587. `retryLater` must be 0 on the first runs (enablement step 4). |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| screening run | Truvi times out or answers 5xx, 408 or 429 | yes | `RETRY` row, count + 1, behind new bookings | yes, `retryLater` |
| screening run | the fifth failed try | yes | `ERROR` with the fixed message, `gaveUp`, run fails once | yes, CloudWatch |
| screening run | wrong subscription key (401, 403) | yes | not saved, not counted | yes, `retryLater` for the batch |
| screening run | the mapper refuses the booking data | yes | `SKIPPED` with the reason | yes, the row |
| screening run | any other error (secret read, bug, wrong `extendedAmount`) | yes | not saved, run fails, tried again | yes, CloudWatch |
| screening run | a retry after a timeout that did reach Truvi | yes, in the echoToken tests | the same `echoToken` gives back the first verification | no |

## What already exists

- The `failedattempts` column and its migration from #3786 are reused; no new migration.
- `saveResult` already overwrites the row of a booking, so a later success replaces the `RETRY` row and empties the count.
- The cancel and modify queries already ignore rows without a `providerassessmentid` or a screening status, so `RETRY` rows never reach them.

## Not in scope

- An alert on `gaveUp`: the failed run in CloudWatch is the signal for now.
- Opening the pull request: after #3786 is merged, so the diff shows only these commits.
