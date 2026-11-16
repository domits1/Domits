# feat: stop retrying a Truvi request after three unexpected 400 answers #3371

Pull request: not opened yet (branch `feature/3371-truvi-attempt-counter`, on top of #3781)
Issue: #3371
Reviewed commit: 40e310e37
Result: 1 blocking finding, fixed before the pull request (commit ecd24458d). Each commit was reviewed as a staged diff before it was made, then the whole branch against `feature/3371-truvi-follow-up`.

This is the attempt counter that the Truvi follow-up (#3781) left for its own pull request, because it needs a new column.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | backend/functions/Truvi-Integration/business/truviBookingModifier.js and truviBookingCanceller.js `#recordFailure` (before ecd24458d) | Every unexpected answer counted, also a 401, 403 or 429. A wrong subscription key would make every row give up after 45 minutes, and the modify run would save new dates that Truvi never got. | Fixed: only a 400 counts (`countsAsFailedAttempt` in `util/truviFailedAttempts.js`). Other 4xx move the row to the back and fail the run, like before. Tests for 401, 403 and 429 in both runs. |
| P3 (7/10) | backend/functions/Truvi-Integration/business/truviBookingCanceller.js `#recordFailure` | After three 400 answers the row is saved as `CANCEL_REFUSED`, but Truvi did not cancel the verification. | Accepted: sending the same wrong request again does not help. `errormessage` says `Truvi refused the request with status 400`, and the schedule doc has a query to find these rows and the steps to try again. |
| P3 (6/10) | backend/ORM/migrations/20261104_guest_risk_assessment_failed_attempts.js:3-4 | `up()` runs two `ALTER TABLE` statements. DSQL allows one DDL per transaction. | Accepted: same pattern as the create migration of #3555. The runbook runs the `.sql` file statement by statement. |
| P3 (6/10) | backend/functions/Truvi-Integration/docs/truvi-screening-schedule.md "Failed Attempts" (before 40e310e37) | Three doc claims were wrong while writing: dates set to `NULL` would not be sent again, a 5xx does not fail the run, and the lookup query also found screening `ERROR` rows. | Fixed in the docs commit before it was made. |
| P4 (8/10) | backend/functions/Truvi-Integration/util/truviFailedAttempts.js `nextFailedAttempt` | The decision moved to one helper in the same commit as the 400-only fix. | Accepted: the helper carries the new rule and keeps the two runs from repeating it. |
| P4 (9/10) | backend/test/Truvi-Integration/truviBookingCanceller.test.js:118 and :120 | Two test lines are longer than 120 characters. | Accepted: style only, the file already had one (`:11`). |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| modify run | Truvi answers 400 to the same date change every run | yes | counted; after the third the new dates are saved with the fixed message and `gaveUp` | yes, the run fails each time and `gaveUp` shows the last one |
| cancel run | Truvi answers 400 to the same cancel every run | yes | counted; after the third `CANCEL_REFUSED` with the fixed message | yes, as above |
| both runs | wrong subscription key (401) or rate limit (429) | yes | not counted, row to the back, run fails | yes, every run fails in CloudWatch, no row gives up |
| cancel run | timeout or 5xx | yes | row to the back of the list (new), `retryLater` | yes, in the summary |
| any run | code deployed before the migration ran | no (manual order); the entity test only checks that the entity and the migrations agree | none, the query fails on the missing column | yes, every run fails; the runbook and the prerequisites say to run the migration first |

## What already exists

- `markAttempt` from #3625 is reused: it now also saves `failedAttempts` when it is given.
- The refused path of both runs is reused for giving up: the modify run saves the dates like a refusal, the cancel run saves `CANCEL_REFUSED`.
- The fixed messages of `util/truviErrorMessage.js` (#3781) are what is saved, so no Truvi text ends up in the row.
- The `ADD COLUMN IF NOT EXISTS` migration pattern of `20260904_booking_*.sql`.

## Not in scope

- The screening run: a booking whose Truvi call keeps timing out has no row yet, so there is nothing to count on. It is tried again until its arrival date has passed.
- A dashboard or alert on `gaveUp`: the failed run in CloudWatch is the signal for now.
- Running the migration on `test` and `main`: by hand with the runbook, before this code is deployed.
