# feat: run the SiteMinder reservations sync from a Lambda handler #603

Pull request: not opened yet (branch `feature/603-siteminder-reservations-schedule`)
Issue: #603
Reviewed commits: 88ab203b4 (handler), and the docs commit after it
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

Fourth step of receiving SiteMinder reservations, after reading them (#3806), asking for and confirming them (#3813) and saving them (`feature/603-siteminder-reservations-save`). This branch is built on the saving branch; the pull request is opened after that one is merged, so the diff only shows this step.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | backend/functions/SiteMinder-Integration/index.js:34 `if (summary.retryLater > 0)` | A run with a reservation that has to wait fails on purpose. Lambda retries a failed asynchronous run twice by default, so EventBridge would run it up to three times in a few minutes. | Accepted: a repeated run is safe, because saving the same reservation again never makes a second booking. The runbook sets the maximum retry attempts to 0 anyway, because the next scheduled run is the retry. |
| P3 (5/10) | backend/functions/SiteMinder-Integration/index.js:31 `secretRepository ??= secretRepositoryFactory(env)` | The login is read once per warm container. After SiteMinder changes the password, the old one is used until the next cold start. | Accepted: the same as the Truvi handler. A wrong login fails every run in CloudWatch, and updating the Lambda configuration starts a new container. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/metadata.json | It names a Lambda that does not exist in AWS yet. | Accepted: `.deployment-disabled` keeps the Lambda check and the deploy away from this function until the Lambda exists, as with Truvi. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| handler | the kill switch is off or has another value than `true` | yes | skipped, nothing is read | no |
| handler | an event without the task, or with another task | yes | 400, nothing is read | no |
| handler | the secret or the config is wrong | yes | the run fails, the next run builds the services again | yes, in CloudWatch |
| handler | a reservation has to wait (database down) | yes | the run fails with only the counts in the error | yes, the alarm on `Errors` |
| handler | the confirmation does not reach SiteMinder | yes | the run fails, the reservations come back and are saved again without a second booking | yes, in CloudWatch |
| schedule | two runs at the same time | no (AWS setting) | the runbook sets reserved concurrency 1 and a 2 minute timeout on a 3 minute schedule | no |

## What already exists

- `SiteMinderReservationSync` does the whole run; the handler only adds the task, the kill switch and the secret cache.
- The handler copies the Truvi handler (`backend/functions/Truvi-Integration/index.js`): same task check, same kill switch rule, same secret cache.
- `siteminder-reservations-schedule.md` follows `truvi-screening-schedule.md`.

## Not in scope

- Creating the Lambda, the EventBridge rule and the alarm in AWS: by hand with the runbook, by a senior developer or DevOps.
- Turning it on: only with our own SiteMinder PMS code, never on the shared `PMSXTEST` account.
- Step 5, sending the new availability to SiteMinder after a reservation: the next pull request.
