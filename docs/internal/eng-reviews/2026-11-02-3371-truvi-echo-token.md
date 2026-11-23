# fix: reuse the echoToken per booking so a Truvi retry never creates a second verification #3371

Pull request: #3632
Issue: #3371
Reviewed commit: d2ab25515
Result: 2 blocking findings (Sonar duplication and code comments), fixed in this push. No blocking findings left in the code.

The review ran after the pull request was opened, not before. That was a process miss on my side.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | backend/test/Truvi-Integration/truviEchoToken.test.js:8-18 and truviScreeningRetry.test.js:8-18 | The same booking fixture was in both new test files, so Sonar measured 7.6% duplication on new code (limit 3%) and the quality gate failed. | Fixed: the fixture is now in `test/Truvi-Integration/truviScreeningInput.js` and both files import it. To confirm when Sonar runs on this push. |
| P1 (9/10) | backend/functions/Truvi-Integration/business/truviScreeningService.js:5 and util/truviMapper.js:34-35 | Three code comments explained the echoToken. The team does not keep comments in the code. | Fixed: removed, and the explanation is now in `docs/truvi-screening-schedule.md`. |
| P2 (8/10) | backend/functions/Truvi-Integration/docs/truvi-screening-schedule.md (What Not To Claim, Rollback) | The docs still said a retry creates a new verification and that deleting a row screens the booking again. Both stopped being true with the per-booking token. | Fixed: removed the retry line and rewrote the deleted-row note. |
| P2 (7/10) | backend/functions/Truvi-Integration/business/truviScreeningService.js:41 `return { ...toErrorResult(error), providerAssessmentId: verificationId };` | When reading the earlier verification fails with a 4xx, the row is saved as `ERROR` together with the verification id, and the screening run does not pick it up again. | Accepted: a timeout or a 5xx on the read is not saved (`isRetryableError` in the screener), so the next run reads it again. A 4xx on a verification Truvi just named is not expected, and the saved id keeps the row usable for cancel. The attempt counter in the Truvi follow-up pull request covers rows that stay in `ERROR`. |
| P3 (6/10) | backend/functions/Truvi-Integration/business/truviScreeningService.js:3 `const ECHO_TOKEN_USED = "already exists from a previous request";` | Spotting the reused token depends on Truvi's English error text. | Accepted: Truvi has no error code for it. The check also needs the `verificationId` in the 400 body (data/truviApiClient.js:76), so a different 400 is never read as a reuse. Covered by truviScreeningRetry.test.js. |
| P3 (5/10) | backend/functions/Truvi-Integration/util/truviMapper.js:82 `echoToken: createEchoToken(booking.id)` | Screening the same booking again later always returns its first verification. Enes asked whether that is on purpose. | Accepted, on purpose: one booking has one Truvi verification. Written down in the schedule docs. |
| P3 (4/10) | backend/functions/Truvi-Integration/docs/truvi-screening-schedule.md (Rollback) | The deleted-row note assumes Truvi keeps an echoToken for good. The sandbox check only shows it for two runs shortly after each other. | Not verified. Kept as written, because it matches the code path. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| Create with a reused token | Truvi answers 400 "already exists" with a verificationId | yes, truviScreeningRetry.test.js | reads the earlier verification and saves its result | no, the booking gets its first result |
| Read of the earlier verification | timeout or 5xx | yes | not saved, tried again next run | no, retried silently |
| Read of the earlier verification | 4xx | yes | saved as `ERROR` with the verification id | yes, the row shows `ERROR` |
| Create | another 400 | yes | no read, saved as `ERROR` | yes, the row shows `ERROR` |
| `getVerification` | called without an id | yes | throws before any request | yes, the run fails |

## What already exists

- `mapCreateResponse` is reused to map the read answer, because Truvi sends the same shape.
- `TruviApiClient.send` is reused for the GET. The request options moved into `#options`, so a GET sends no body and no `Content-Type`.
- `isRetryableError` in the screener already keeps timeouts and 5xx out of the table, so the read failure needs no new retry logic.

## Not in scope

- The older Truvi tests keep their own fixtures: they differ (rules, empty guest email), and changing them would change those tests.
- A fixed error message per status, an attempt counter and case-insensitive statuses: the Truvi follow-up pull request, before the schedule is enabled.
