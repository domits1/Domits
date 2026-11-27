# refactor: shared night availability and ARI_CHANGE_SOURCE #603

Pull request: not opened yet (branch `feature/603-shared-night-availability`)
Issue: #603
Reviewed commits: e2214b8c4 (shared night availability), dfec405e6 (ARI_CHANGE_SOURCE), 8960292bf and 5aa344216 (design note)
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made.

Step 1 of sending Domits availability to SiteMinder, as agreed with Enes on 23 November 2026. The plan is in `backend/functions/SiteMinder-Integration/docs/siteminder-availability-sync-design.md`. This pull request changes no behaviour.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/.shared/channelManagement/utils/channexAriPayloadUtils.js, both `buildBookingAwareAvailability` calls | The unit count moved from inside the function to a parameter, so a call that forgets it would compute with `undefined` and sell nothing. | Accepted: both Channex calls pass `CHANNEX_FULL_SYNC_DEFAULTS.DEFAULT_SELLABLE_UNIT_COUNT`, the snapshot and ARI tests pass without edits, and the new `domitsNightAvailability.test.js` fails when the parameter is ignored (checked by breaking it on purpose). |
| P3 (7/10) | backend/functions/SiteMinder-Integration/business/siteMinderReservationImporter.js (on #4000, not in acceptance yet) | #4000 still imports `CHANNEX_ARI_OUTBOX_SOURCE`, which this pull request renames. Whichever of the two is merged second breaks the import. | Accepted: if #4000 is merged first, this branch takes acceptance and renames that one import; otherwise #4000 does. Written in both pull request descriptions. |
| P4 (6/10) | backend/functions/ChannelManagement/tests/channexAriOutboxConstants.test.js | The rename edits this test, while the extraction keeps every ARI test unedited. | Accepted: the rename changes only the import and the name, the expected values are the same. The extraction commit itself edits no test. |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| Channex availability payload | the moved rules compute a different night | yes, `channexAriPayloadSnapshot.test.js` and the ARI tests, unedited | the build fails | no, it never ships |
| outbox writes | a write site still uses the old name | yes, the full backend suite imports every write site | the build fails | no |

## What already exists

- `countActiveBookingsByNight` stays in `channexBookingAvailabilityBridge.js` and is imported from there.
- `normalizeValueToCalendarInt` from `channexAriDateUtils.js` is reused by the shared module.

## Not in scope

- Steps 2 to 4 of the design: the SiteMinder outbox table and writer, the fan-out with `enqueueAriChange`, and the worker.
