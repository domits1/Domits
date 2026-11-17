# feat(hostproperty): show why a listing was rejected in the editor (#3302 A2)

Issue: #3302
Reviewed: working-tree diff on feature/3302-host-rejection-banner (not yet staged), 4 modified files and 1 new test file
Result: 0 blocking, 0 fix now, 3 follow-up

## Findings

| Verdict | Where | Finding | Decision |
|---|---|---|---|
| FOLLOW-UP (6/10) | HostPropertyShell.js:406 | `hasRejectedAt = Boolean(latestRejection?.rejectedAt)` trusts the caller to pass a normalized value. Rendering the banner directly with a seconds-sized or invalid `rejectedAt` would print a wrong or "Invalid Date" line. The only caller, HostPropertyEditor.js:911, passes the output of `normalizeLatestRejection` (hostPropertyUtils.js:788), and the tests cover that path. | Acceptable now. Revisit if a second caller appears. |
| FOLLOW-UP (5/10) | HostPropertyEditor.js:744-749 | Switching listing navigates and refetches. If the refetch fails, `status` and `latestRejection` keep the previous listing's values, because the effect only sets state on success. This staleness already applies to every other field in the editor. | Not changed here. The banner is not worse than the surrounding form. |
| FOLLOW-UP (4/10) | hostPropertyUtils.js:715,727 | `MIN_REJECTED_AT_MS = 1e11` is the seconds-versus-milliseconds cutoff (1973 in ms). A future-dated `rejectedAt` is accepted and shown. | Intended: an unusable date shows no date line. Future dates are a backend concern. |

## Not in scope

- Translations: the editor is hard-coded English today (decision from the plan). No `useLanguage`, no content/*.json changes.
- Showing rejection history: the contract returns only `latestRejection`.
- A refetch after the status change, so a repeat rejection shows its new reason without a reload: the status PUT returns only the status.
- Backend contract (PR #3784): not on acceptance yet. The field is treated as absent, and the banner falls back to "No reason was given.".

## What already exists

- Status labels and the resubmit flow (`resolveStatusOptions`, "Submit for review" enabled for REJECTED) are reused as is. The hint text points at that menu entry.
- `normalizeListingStatus` and `LISTING_STATUS` gate the banner. No new status logic.
- No shared notice component or CSS existed, so `.rejectionBanner*` classes were appended to HostProperty.module.css.

## Failure modes

| Path | Realistic failure | Test | Handling | User sees |
|---|---|---|---|---|
| Field missing (backend not deployed) | `latestRejection` undefined | yes, "a missing field" | normalizer returns null | banner with the fallback reason |
| Reason is HTML or very long | markup injection, layout break | yes, literal-text test | React text node, `pre-wrap`, `overflow-wrap: anywhere` | the text as written |
| `rejectedAt` in seconds, NaN, string, out of range | wrong date such as 1970 | yes, four cases through the normalizer | date set to null | no date line |
| Host resubmits | stale banner | yes, REJECTED to PENDING_REVIEW | gated on live `status` | banner disappears |
| Listing is not rejected but the field is set | banner on the wrong listing | yes, five statuses | gated on `status`, not on the field | no banner |

No critical gap.

## Data flow

```
GET /hostDashboard/single
  -> extractFetchedPropertyData
       status ----------------------> useState(status) ------+
       latestRejection -> normalize -> useState(latestRejection)
                                                              v
                    <HostPropertyRejectionBanner status latestRejection>
                      status !== REJECTED -> null
                      otherwise reason | fallback, optional date, hint
```

## Verification

- New file HostPropertyShell.rejection.test.js: 27 tests, red before the implementation, green after.
- Mutation check on a scratchpad copy: gating on `Boolean(latestRejection)` instead of `status` failed 8 tests. The original was restored with an identical sha256.
- src/features/hostdashboard: 156 suites, 1866 tests pass. Whole web suite: the only failure is the known listingDetails2.test.js.
- ESLint is clean on the touched files. Prettier is clean on the new test file.
