# feat(property-owners): add owner form validation rules

Pull request: (to be opened)
Issue: #3239
Reviewed commit: uncommitted changes on top of da8dcae0e
Result: no blocking findings

Covers `hostowners/utils/ownerText.js`, with the text helpers moved out of `OwnersTable.js` and `HostOwners.js` without a behaviour change, and `hostowners/utils/ownerFormRules.js` with its tests.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | frontend/web/src/features/hostdashboard/hostowners/utils/ownerFormRules.test.js | The test imported `ownerConstants.js` and `ownerValidator.js` from `backend/`. That couples the web tests to another workspace, and it breaks if the validator ever imports something the web Jest setup cannot load. | Fixed before commit. The backend limits, lists, default status and patterns are copied into the test as fixtures. The input cases are a plain table of input and the verdict the backend returned. The test names name the backend file each value comes from. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/utils/ownerFormRules.js:127 | The company name field is only shown for a company or trust. A company that became an individual kept its stored company name, and the field to clear it was hidden. | Fixed before commit. When the stored owner type is company or trust, the edited type is individual and the stored owner has a company name, the update sends `company_name: null`. Tests cover company and trust becoming an individual, and an individual without a company name. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/hostowners/utils/ownerFormRules.js:131 | A first version of the fix above sent `company_name: null` in every update of an individual that already has a stored company name, so the save button was enabled as soon as the form opened. | Fixed before commit. The company name is cleared only when the stored type is company or trust and the edited type is individual. An unchanged form sends nothing and keeps save disabled; tests cover an unchanged individual with a stored company name, in the rules and in the form. |

## Not in scope

- Keeping the fixtures in line with the backend automatically: when the backend rules change, the fixtures and the frontend rules are updated by hand.
- The form that uses these rules: the owner form modal pull request.
