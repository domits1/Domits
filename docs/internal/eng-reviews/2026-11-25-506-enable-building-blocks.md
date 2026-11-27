# Eng review: enable building blocks (#506)

Issue: #506
Review feedback: Karim, on #3984: 1,794 lines is over the 1,000 line limit, so the part that does not touch the flow is split out.
Reviewed commits: `b06e74263`, `6acb76bd9`, `48a662e6d`
Result: no blocking findings

## What this is

The pieces #3984 needs that do not change what a host sees, copied whole from `feature/506-platform-cards-enable` so the files stay byte-identical and drop out of #3984's diff when `acceptance` is merged into it.

| Piece | Files |
|---|---|
| The `enableDistribution` mock, with two fixtures and the error outcomes | `services/hostDistributionApi.js`, `.test.js` |
| What to do when turning on fails, decided by `errorCode` | `utils/enableErrors.js`, `.test.js` |
| The timezone picker | `components/TimezoneModal.js`, `.test.js` |

Nothing imports `enableDistribution`, `classifyEnableError` or `TimezoneModal` yet, and `MOCK_HOST_DISTRIBUTION_ENABLED` stays `false`, so the two new mock listings are never shown. The wiring (the connect flow, its layer and the section) stays in #3984.

One word differs from the copy in #3984 as it stood: the header comment of the mock said `enableDistribution({ propertyId, timezone })`, but the function takes `chosenTimezone`. The same one-word fix is made on #3984 so the two files stay identical.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `utils/enableErrors.js`, `classifyEnableError` | `ENABLE_ERRORS[errorCodeOf(error)]` is a plain object lookup. An `errorCode` such as "constructor" would find a function on the prototype and the caller would get no message. `classifyListingError` has the same shape. It needs the backend to send such a code. | Not changed here, to keep the copy identical. Follow-up. |
| P3 (6/10) | `components/TimezoneModal.js`, top comment | Still says the ids are "PROPOSED, TO CONFIRM WITH ENES". | Left as it is; to confirm with Enes. |

## Not in scope

- The flow that uses these pieces, its timeouts and its error handling: #3984.
- Trimming the long comment blocks in these files: they stay as copied, so the drop-out in #3984 is clean.
- Mutation checks: no behaviour was written in this change; the tests are the ones of #3984, which carry them.

## Failure modes

None are new: no code path is reachable from the app. The mock's own paths (not ready, timezone needed, invalid zone, in progress, try again, already connected) each have a test.

## Tests

The distribution folder passes (338 tests). In the whole web suite one file is red, `panoramaElitePagesPin.test.jsx` (4 snapshots), an accepted baseline that fails the same way on `acceptance` without this change. `websiteEditorPageSitePages.test.jsx` timed out once under load and passes alone (22 tests). `listingDetails2.test.js` did not fail.

## Size

About 536 added lines in all: the mock 120 (and 4 changed), its tests 137, the error table 44 and 67, the modal 58 and 65, and this note.
