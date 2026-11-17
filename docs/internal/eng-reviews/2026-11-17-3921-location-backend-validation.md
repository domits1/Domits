# fix(property): refuse location values the columns cannot store, on update and create (#3921)

Pull request: #TBD (fill in when the pull request is opened)
Issue: #3921 (related, not closed by this pull request)
Reviewed commit: `9f579e2e2`
Result: no blocking findings

Follow-up of the eng-review of #3938, which left three gaps in the backend. `normalizeLocationPayload` (overview update) and `PropertyBuilder.addLocation` (create) accepted a house number above the INTEGER range, a house number below 1, and an extension over 45 characters (`VARCHAR(45)`). The database rejected them later, and the update path answered 500 with the raw database message.

Decisions from Enes: the checks go in `normalizeLocationPayload` and `PropertyBuilder.addLocation`, not in the `PropertyLocation` model setters; floats are truncated and then checked; a digit string too long for a number is reported as too large; "Missing houseNumber." stays as it is on create; the new create errors answer 400.

Added during implementation, not decided: the checks and the two constants live in one function, `getLocationLimitError`, next to the constants in `util/locationLimits.js`, so the two paths do not repeat three messages. Extension length counts characters (code points), as `VARCHAR` does, not UTF-16 units.

## Verified before the change

- `LocationMapping.mapDatabaseEntryToFullLocation` builds a `PropertyLocation` from every stored row (`util/mapping/location.js:14`). Checks in the model setters would make a row saved before this change (0, negative, long extension) fail to load, so the checks run on write only. A test pins that such rows still load.
- Overview update order: `normalizeOverviewPayload` (`propertyController.js:569`) runs before `authorizeOwnerRequest` (`:571`) and before `propertyService.updatePropertyOverview`, which writes title and description first (`propertyService.js:434`) and the location later (`:449`). A failure of the new checks therefore happens before any write. Before this change, a database failure at the location left title, description and capacity saved and the rest not.
- The create handler answers `error.statusCode || 500` (`propertyController.js:306`). `TypeException` carries `statusCode = 400` (`util/exception/TypeException.js`), a plain `Error` does not, so the create checks throw `TypeException`.
- The only writers of a location are `propertyService.js:916` (create) and `:931` (update). Both are covered.

```
PATCH /property/overview             POST /property
  normalizeOverviewPayload             createPropertyObject
    normalizeLocationPayload             PropertyBuilder.addLocation
      getLocationLimitError ──┐            getLocationLimitError ──┐
      Error "Location ..."    │            TypeException (400)     │
      isOverviewClientError ▶ 400          create catch ▶ 400      │
  (before authorize, before any write)   (before any write)        │
                                                                   │
GET (LocationMapping ▶ PropertyLocation): no limits, old rows load ◀┘ not applied
```

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (9/10) | `propertyBuilder.js:156` and `propertyController.js:306` | `throw new Error(\`Missing ${item}.\`)` has no `statusCode`, and the create handler answers `error.statusCode \|\| 500`. House number `0` on create, and every other "Missing ..." field, already answers 500. | Not changed: "Missing houseNumber." stays as decided. Own issue. |
| P4 (8/10) | `propertyBuilder.js:160-165` | A fractional house number such as `12.5` passes the create checks (no integer check). How the INTEGER column treats it was not verified. | Accepted, not in scope. |
| P4 (8/10) | `propertyService.js:449` | The editor sends the location on every save. A listing already stored with house number 0 now fails every overview save with a 400 until its host changes the number. | Accepted. Recoverable, no data loss, and #3938 already blocks the same value in the editor. |
| P5 (7/10) | `util/locationLimits.js` | `!(houseNumber <= MAX_HOUSE_NUMBER)` is a negated comparison. It is deliberate: it sends `NaN` and `Infinity` into the "too large" branch. | Accepted, a comment says why. |
| P5 (6/10) | `test/PropertyHandler/locationLimits.test.js` | The POST 400 test replaces `createPropertyObject`, so it proves the status mapping and not that `body.propertyLocation` reaches `addLocation` (`propertyController.js:3970`, unchanged). | Accepted. |

## Not in scope

- The "Missing ..." errors on create answer 500 (first finding). They need their own issue.
- Fractions on create (`12.5`) and the behaviour of the INTEGER column for them.
- Non-string extensions sent to the update path are still ignored and stored as "" (unchanged).
- Existing rows that break the limits are not migrated or listed. The count was not checked.
- No frontend file is touched. The messages follow the wording of #3938 with a `Location ` prefix so `isOverviewClientError` answers 400.

## Test run

New file `backend/test/PropertyHandler/locationLimits.test.js`, 39 tests: update path (too large, below 1, kept values, extension length, 45 against 46, emoji counted as one, missing number message, client-error predicate, PATCH answers 400 before authorizing or writing), create path (limits, "Missing houseNumber." kept for 0 and NaN, largest accepted, POST answers 400), and reading old rows still works. `normalizeLocationPayload.test.js` (#3938) is not touched.

Each key test was mutation-checked: removing the update check failed 15 tests, removing the create check failed 7, throwing a plain `Error` on create failed 3, restoring the `Infinity` to null parse failed 1, counting UTF-16 units failed 1.

The full backend suite has the same failures with and without this change: 17 suites and 11 tests that need missing packages or a valid AWS SSO session, or trip on CRLF line endings (not verified). `test/PropertyHandler/end-to-end.test.js` is excluded, as in CI. One run showed `staticPageOutbox.publishController.test.js` failing under full-suite load; it passes alone and in the next full run (timing flake, not investigated). Passing tests went from 5977 to 6016, the 39 new ones.
