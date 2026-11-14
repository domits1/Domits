# Remove the unused `transitionStatus`

Issue: #3302 (follow-up from `2026-11-04-3302-archive-metadata-schema.md`)  
Branch: `chore/3302-remove-transitionstatus`  
Scope: `PropertyRepository`, refactor only. No behaviour change.

## Findings and decisions

| Area | Finding | Decision |
|---|---|---|
| Callers | Repo-wide search: `transitionStatus(` has no caller outside its own tests. `PropertyService` and the controller use `transitionStatusWithEvent` or `updatePropertyStatus`. Other Lambdas with a `propertyRepository` file do not call it. | Remove the method. |
| Origin | Added in the approval flow (#3302) as a compare-and-set. `transitionStatusWithEvent` later replaced it and adds the stale-write check on `updatedat` and the moderation event. | Superseded, nothing is lost. |
| Shared helper | `clearArchiveMetadata` is also called by `transitionStatusWithEvent`. | Stays. |
| Dedicated tests | `propertyRepository.transitionStatus.test.js` (10 cases) only tested the removed method. | Deleted. |
| Schema tests | Three cases in `propertyRepository.archiveSchema.test.js` used `transitionStatus` only to trigger `clearArchiveMetadata`. They cover live behaviour: schema qualification, the `TEST` override, schema sanitising including the injection row. | Re-pointed to `updatePropertyStatus("property-1", "INACTIVE")`. Assertions unchanged. |

## Verification

- `archiveSchema` test file: 11 of 11 pass, asserting the exact qualified `UPDATE ... SET ... = NULL` SQL and the `$1` schema parameter.
- Full backend suite compared with the same suite on the untouched tree: the same 16 failing suites and 27 failing tests. Passing tests dropped by exactly the 10 deleted cases.
- `test/PropertyHandler` run on its own: 3 failing suites, identical with and without this change (verified by stashing). `directBookingWebsiteSiteRepository.inactiveProperties` fails only in the folder run, not the full run.
- No remaining reference to `transitionStatus(` in `functions/` or `test/`.

## Follow-up

- None from this change. The unrelated baseline failures and the order-dependent `inactiveProperties` test are outside this scope.
