# fix: Truvi follow-up before the schedule is enabled #3371

Pull request: not opened yet (branch `feature/3371-truvi-follow-up`, on top of #3632)
Issue: #3371
Reviewed commit: 5b896b868
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made, then the whole branch against `feature/3371-truvi-echo-token`.

This pull request closes the points the earlier Truvi reviews left for "the follow-up before the schedule is enabled" (#3555, #3625, #3632).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | backend/functions/Truvi-Integration/util/truviMapper.js:113 (before) `const domitsStatus = SCREENING_STATUS[status];` | A Truvi status was looked up as an object key, so `"constructor"` or `"toString"` returned a function instead of `ERROR`, and `APPROVED` or `approved` was not recognised. | Fixed: the lookup goes through a `Map` on the lower-case name and only accepts strings (commit 0de659212). |
| P2 (8/10) | backend/functions/Truvi-Integration/business/truviScreeningService.js, truviBookingModifier.js, truviBookingCanceller.js | Truvi's error text was saved in `errormessage` and put in the run summary. Truvi's text can repeat guest data (raised on #3509 and #3555). | Fixed: `util/truviErrorMessage.js` gives a fixed message per status, or the known reason in our own words (commits 59a0030bf and 5b896b868). A test checks that a name, email and phone in Truvi's text never come through. |
| P2 (7/10) | backend/functions/Truvi-Integration/util/truviConfig.js:13 | `TRUVI_BASE_URL` fell back to the sandbox, so a production Lambda without the setting would screen against the sandbox without anyone noticing. | Fixed: the setting is required (commit 50ff3d1d7). The Lambda in AWS needs `TRUVI_BASE_URL` before the schedule is enabled; it is in the required variables of truvi-screening-schedule.md. |
| P3 (7/10) | backend/functions/Truvi-Integration/business/truviBookingModifier.js:90 and truviBookingCanceller.js:78 | After the fix, an unexpected 400 only shows its status in CloudWatch, not Truvi's reason. | Accepted: privacy comes first. The reason can be looked up in Truvi with the `bookingId` from the summary. |
| P3 (6/10) | backend/functions/Truvi-Integration/util/truviMapper.js `toAddressLine1` | `addressLine1` could contain the literal text `null` when the house number or extension was empty. | Fixed: empty parts are left out, and a property without a street is saved as `SKIPPED` without a Truvi call (commit 9f1c6b245). |
| P3 (6/10) | backend/functions/Truvi-Integration/business/truviBookingScreener.js `#skipped` | Bookings Domits cannot send were saved as `ERROR` with a fake status 400, which looked like a Truvi error. | Fixed: saved as `SKIPPED` with `error.status` null (commit 1329f0504). The queries do not filter on `ERROR`, so nothing else changes. `FAILED` was not used, because that means Truvi rejected the guest. |
| P3 (6/10) | backend/functions/Truvi-Integration/util/truviMapper.js `toIsoDate` | Truvi gets the UTC day. The booking API also accepts a numeric timestamp (`bookingDateParser.js`), and one that is not at UTC midnight can land on the day before. | Fixed as a check: the booking is still screened (a skipped booking would never be protected), but it is counted in `notUtcMidnight` and logged with only its `bookingId` (commit fb07a60ac). |
| P3 (5/10) | backend/functions/Truvi-Integration/util/truviMapper.js `bookingToCreateRequest` | `town` and `postcode` can still be `null`. | Not in scope: not on the follow-up list. |
| P3 (5/10) | backend/functions/Truvi-Integration/business/truviBookingModifier.js | The modify run sends the UTC day too but does not count dates that are not at UTC midnight. | Not in scope: the dates it sends were saved by the screening run, which already counts them. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| screening run | Truvi answers 400 with guest data in the text | yes, truviErrorMessage.test.js | saved as `Truvi refused the request with status 400` | yes, in `errormessage`, without guest data |
| screening run | property without a street or location, host without email | yes | saved as `SKIPPED`, no Truvi call, not tried again | yes, the row and `rejected` in the summary |
| screening run | booking date not at UTC midnight | yes | screened with the UTC day, counted and logged | yes, `notUtcMidnight` and a log line |
| any run | `TRUVI_BASE_URL` missing in AWS | yes, truviConfig.test.js | the run fails before any Truvi call | yes, the run fails in CloudWatch with a clear message |
| any run | Truvi sends a status in another case | yes | read the same way | no, works as before |

## What already exists

- The refusal reasons the modify and cancel runs already matched (`REFUSED_MESSAGES`) are reused for the fixed message. The cancel run now keeps them in one list, like the modify run.
- `isUtcMidnight` sits next to `toIsoDate` in the mapper, which already decides the day that goes to Truvi.

## Not in scope

- An attempt counter for rows that keep failing. It needs a new column, so a DSQL migration that has to run on `test` and `main` before the code is deployed, because TypeORM reads every column of the entity. That goes in its own small pull request with its own runbook. A failing row already moves to the back of the modify list since #3625.
- The same "failing row stays at the front" risk in the cancel run (#3603) and the screening run (#3587), noted on #3625.
- `town` and `postcode` checks in the create request.
