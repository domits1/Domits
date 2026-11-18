# fix(property): refuse a house number the location cannot store, in the editor and in onboarding (#3921)

Pull request: #3938 (fill in when the pull request is opened)
Issue: #3921 (related, not closed by this pull request)
Reviewed commits: `a3cfbfc8e` (backend contract test), `af4295ce1` (editor and shared helper), `a916d65e2` (onboarding)
Result: no blocking findings

The location table stores the house number in an `INTEGER NOT NULL` column and the rest in `housenumberextension VARCHAR(45)`. The editor parsed the house number before saving and, for a value that did not start with a digit such as "A12", left the location out of the request. The rest of the form saved with a 200, so the host was never told. Onboarding turned "12A", "12-14" and "A12" into `0`, which the backend builder rejects only at submit ("Missing houseNumber."). The comment of Enes on the issue could not be read (the issue page shows no comments when fetched anonymously), so this follows the description relayed in the task; the analysis below is from the code.

Decisions from Enes: a typed house number that cannot be stored blocks the save with a message; a fully empty address still saves the rest without a location; a partly filled address is out of scope; letter-first numbers like "A12" are not supported for now, so the message is the fix; numbers above the INTEGER range are rejected with the same kind of message; onboarding is fixed in the same branch.

Added during implementation, not decided: a house number of `0` is also refused ("House number must be at least 1."), so the editor and onboarding agree with the create path, which rejects `0`. `HostPropertyOverviewTab` became a named export so its test can render the Overview tab without the required props of the whole tab wrapper.

## Findings

Review of `a3cfbfc8e` (backend contract test):

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (8/10) | `backend/functions/PropertyHandler/controller/propertyController.js:1398-1399` | The numeric path (`Number.isFinite(houseNumberRaw)` then `Math.trunc`) accepts `0` and negative numbers, while the string `"-12"` is rejected. The create builder rejects `0` as missing (`propertyBuilder.js:153`). | Accepted and deliberately not pinned by the test, so it does not freeze the quirk. The frontend helper rejects `0`. Follow-up if the backend should agree. |
| P4 (9/10) | `propertyController.js:1398` | Nothing caps the number against the `INTEGER` column. A request with `99999999999` passes validation and fails at the insert as a 500. | Accepted for this pull request, because the decision was to reject it in the frontend. The backend check is a follow-up. |
| P5 (6/10) | `backend/test/PropertyHandler/normalizeLocationPayload.test.js` | "answers a rejected house number as a client error" asserts the `isOverviewClientError` predicate, not the HTTP status of the handler. | Accepted. The prefix rule is the part that can regress. |

Review of `af4295ce1` (editor and shared helper):

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `frontend/web/src/features/hostdashboard/hostproperty/utils/hostPropertyUtils.js:371-374` | `buildHouseNumber` shows a stored `0` as `"0"`, and the overview endpoint accepts a numeric `0`, so a listing with house number 0 could exist. After this change every save of it, from any tab, stops with "House number must be at least 1." until the host fixes it. Not verified against real data. | Accepted. It is recoverable and has no data loss, and the create path already rejects 0. |
| P4 (8/10) | `frontend/web/src/features/hostdashboard/hostproperty/services/hostPropertyApi.js:304-306` | The guard also fires from the Pricing, Amenities and Policies tabs, as decided, and a test pins it. On those tabs the message shows in the bottom error line and the toast without saying where the field is. | Accepted. Optional follow-up: add "You can change it on the Overview tab." when the save comes from another tab. |
| P5 (7/10) | `hostPropertyUtils.js:293` | The `if (!parsedHouseNumber) { return undefined; }` branch of `getLocationPayload` can no longer be reached through `savePropertyChanges`; it stays as a silent-drop path for any future caller of the export. | Accepted as a defensive default. The only caller today is `savePropertyChanges`. |
| P5 (8/10) | `frontend/web/src/features/hostdashboard/hostproperty/components/HostPropertyTabContent.js:494` | The field message reuses `styles.checkinFieldError`, a class named after the check-in selects. | Accepted, to avoid new CSS. |
| P4 (7/10) | `backend/ORM/schema.psql:305` | `housenumberextension VARCHAR(45)`: an extension longer than 45 characters passes this validation and fails at the database. | Accepted, not in scope. |

Review of `a916d65e2` (onboarding):

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P5 (8/10) | `frontend/web/src/features/hostonboarding/views/3_AddressInputView.js` (click handler) | The guard `if (houseNumberError \|\| !parsedHouseNumber) { return false; }` is unreachable from the UI, because the button is disabled for those values, and no test reaches it. | Accepted. It prevents a null dereference if the enabling condition ever drifts. |
| P5 (7/10) | `frontend/web/src/features/hostonboarding/components/AddressFormFields.js` | The label still says "ex: 123 a", although "123a" now works as well. | Accepted, copy is outside the decisions. |
| P5 (6/10) | `3_AddressInputView.js` | The message appears while typing, as soon as the first character is a letter. | Accepted. |

## Not in scope

- A partly filled address (for example street set and city empty) still drops the location silently, as decided. By the eng-review definition that is a critical gap: no test, no handling, no visible symptom. It needs its own issue.
- Letter-first house numbers like "A12". They need a text column and a migration across the readers. Enes decides whether that becomes its own issue.
- The extension length (`VARCHAR(45)`), the backend INTEGER check and the backend handling of `0` and negative numbers.
- The boat and camper variants of the onboarding address step use other store slices (`boatDetails`, `camperDetails`); no test existed for them and the wiring is unchanged.

## Test run

New tests: 12 for the backend contract (`normalizeLocationPayload.test.js`), and in the web app the helper tests (`utils/houseNumber.test.js`), 5 for the save path (`savePropertyChanges.houseNumber.test.js`), 7 for the Overview tab field (`HostPropertyOverviewTab.houseNumber.test.js`) and 8 for the onboarding step (`AddressInputView.test.js`). Each key test was mutation-checked: removing the save guard failed 3 tests, removing the field message failed 2, parsing letter-first values as numbers failed 3 backend tests, removing the onboarding hold failed 2, not passing the message to the form failed 2, and putting `console.log(builder)` back failed 1.

The full suites have the same failures with and without this change. Backend: 15 suites (11 tests) that need packages missing from this checkout (`@aws-sdk/client-cloudwatch`, `fast-xml-parser`) or a valid AWS SSO session, plus a few tests that read files as text and appear to trip on the CRLF line endings of this Windows checkout (not verified). `test/PropertyHandler/end-to-end.test.js` is excluded, as in CI. Web: 1 suite (9 tests), `listingDetails2.test.js` (RangeCalendar availability), which this change does not touch and which was not investigated.
