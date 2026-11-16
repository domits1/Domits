# feat(distribution): load the Last sync card from real data (#506)

Pull request: #TBD
Issue: #506
Reviewed commits: `cf114e107`, `727377c0c` (outcome-rule fix)
Result: no blocking findings

This work builds on the property picker (`feature/506-distribution-property-picker`) and is meant to be opened after that pull request is merged.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/hooks/useLatestSyncEvidence.js:50-51` | The hook returned `result` for any non-empty property. In the render where the picked property changed, `result` still held the previous property's evidence, because the reset only runs in the effect afterwards. The card could show the new property's name above the old property's sync outcome for one frame. | Fixed before the commit: every result carries its `propertyId`, and a result for another property is replaced by the loading state. The test "never pairs the previous property's item with the newly selected property" records every render, failed first, and now passes. |
| P4 (8/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/components/LastSyncCard.js` (`describeOutcome`) | Evidence rows with status `COMPLETED_WITH_WARNINGS` have `overallSuccess: true` (`deriveEvidenceOutcome`). Under the agreed rule order the success rule wins, so the card says "Last sync succeeded" although the backend counted warnings. | Fixed in `727377c0c`: warnings are checked before success, so a status of `COMPLETED_WITH_WARNINGS`, or a success with a `warningCount` above 0, reads "Last sync finished with warnings" with the pending badge "Warnings". The same commit shows `PARTIAL` as "Partly failed" with the red badge, and counts `INVALID_REQUEST` as failed. Tests cover each changed rule, including that `COMPLETED_WITH_WARNINGS` no longer reads "succeeded". |
| P4 (6/10) | `frontend/web/src/features/hostdashboard/hostchanneldistribution/hooks/useChannexDistribution.js` | The reload after a connect or disconnect no longer refetches the sync evidence, because the old reload key lived in this hook. | Accepted, because both modal flows are unreachable while `MOCK_CONNECT_FLOW_ENABLED` is `false`. |
| Resolved | `frontend/web/src/features/hostdashboard/hostchanneldistribution/views/HostChannelDistribution.js` | This change resolves the accepted P3 finding from the property picker pull request (#3920): with the preview flag on, the Last sync card did not receive evidence, because the picker needed the status first and the status hook needed the picked property. | The evidence now has its own hook that takes the picked property, so the card receives real evidence and no longer depends on `MOCK_PREVIEW_SECTIONS_ENABLED`. |

## Architecture and data flow

Level: component. The status hook only loads the status. The picker waits for the status, and the evidence hook waits for a picked property, so there is no cycle.

```text
HostChannelDistribution
  │ useChannexDistribution() ──▶ GET /integrations/channex/status
  │        connected or needs attention?
  ▼
useMappedProperties({ enabled }) ──▶ picker options, selected property
  ▼
useLatestSyncEvidence({ domitsPropertyId })     (idle until a property is selected)
  └─ GET /integrations/channex/sync-evidence/latest?domitsPropertyId=…
        404 CHANNEX_NOT_FOUND ─▶ UNAVAILABLE (no card, no sentence)
        other failure ────────▶ ERROR (sentence on the card only)
        item: null | {…} ─────▶ LOADED
  ▼
LastSyncCard({ propertyName, loadState, item })
```

Outcome rules of the card, first match wins:

```text
1. finishedAt is null ───────────────────────▶ "Last sync started on … and has not finished."   (pending badge)
2. COMPLETED_WITH_WARNINGS, or
   overallSuccess with warningCount > 0 ─────▶ "Last sync finished with warnings on …."         (pending badge "Warnings")
3. overallSuccess is true ───────────────────▶ "Last sync succeeded on …."                      (green badge)
4. status PARTIAL ───────────────────────────▶ "Last sync partly failed on …."                  (red badge "Partly failed")
5. errorCount > 0, FAILED or INVALID_REQUEST ▶ "Last sync failed on …."                         (red badge)
6. BLOCKED / NOOP ───────────────────────────▶ "… was blocked on …." / "… had nothing to send on …."  (pending badge)
7. anything else ────────────────────────────▶ "Last sync finished with warnings on …."         (pending badge)
```

## What already exists

- `getLatestChannexSyncEvidence` in `hostintegrations/channexApi.js` already called this endpoint. It is reused with only `domitsPropertyId`, because the backend overwrites `userId` with the token's `sub`. Only a test was added for it.
- The picker's "unavailable" pattern (HTTP 409 shows nothing, because the status card explains it) is reused for the 404 `CHANNEX_NOT_FOUND` of this endpoint.
- `LastSyncCard` and its badge styles already existed. The card keeps its badges and gains the property line and the sentences.

## Failure modes

| Failure mode | Test coverage | Handling and user-visible result |
|---|---|---|
| The user has no Channex integration (404 `CHANNEX_NOT_FOUND`) | Hook test and view test | No card and no sentence, because the status card explains it. Nothing is logged. |
| Server error, network failure, or a 404 without that code | Hook test and view test | "We couldn't load the last sync." on the card only. There is no page-wide error and no Retry button. The detail goes to the console. |
| The property has no evidence yet (`item: null`) | Card test, view test | "No sync has run for this property yet." |
| A sync started but has no finish time | Card test | "Last sync started on … and has not finished." (or "Last sync has not finished." without a start time) |
| Evidence with status `BLOCKED` or `NOOP` | Card tests | A neutral sentence and a pending-style badge. `BLOCKED` with errors counts as failed. |
| Evidence with status `COMPLETED_WITH_WARNINGS`, `PARTIAL` or `INVALID_REQUEST` | Card tests | "Finished with warnings" with the pending badge, "Partly failed" with the red badge, and "failed" with the red badge. `COMPLETED_WITH_WARNINGS` never reads "succeeded". |
| A status the card does not know | Card test | Treated as the warnings case. Open question for the backend owner. |
| The picked property changes while a request is pending | Hook tests | The previous item is dropped at once and a late response is ignored. |
| No property is linked, or Channex is not connected | View tests | No request and no card. |

None of these is a critical gap.

## Performance

One read-only GET each time the picked property changes, and none while no property is selected. No polling.

## Not in scope

- Showing `errorCount`, `warningCount` or the notes of a sync. That belongs to the sync history card in a later pull request.
- The Property mapping table. It stays hidden behind `MOCK_PREVIEW_SECTIONS_ENABLED`.
- The one-frame stale state in `useMappedProperties` when `enabled` is switched off and on again. It is an accepted P4 in the property picker review and was not touched here.
- Which evidence statuses exist. The ones found are `SUCCESS`, `COMPLETED_WITH_WARNINGS`, `PARTIAL`, `FAILED`, `BLOCKED`, `NOOP` and `INVALID_REQUEST`, and the full set may be larger. `SKIPPED`, which appears in the booking poll service, is a poll-log status and never an evidence row. Open question for the backend owner.
- Backend code, the allowlist, and any Channex write route. `MOCK_CONNECT_FLOW_ENABLED` stays `false`.
- 9 failing tests in `listingDetails2.test.js`, which also fail on untouched `origin/acceptance` (`ce716e4fa`).
