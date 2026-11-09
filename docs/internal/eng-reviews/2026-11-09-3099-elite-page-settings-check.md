# #3099 Add the read-only Elite check for website page settings

Issue: #3099
Reviewed: the staged diff of each commit on `elite-page-settings-check`, and the whole branch diff before opening, up to 3756c01cb
Result: 0 blocking, 3 fixed, 1 removed in the next pull request

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | websiteElitePageSettings.js, `mayServePageSettings` | The plan read had no time limit. A read that stalls would hold the public render and preview until the gateway gives up, instead of the one-page site with status 200. | Fixed: `withinTimeLimit` with 3 seconds (`WEBSITE_PLAN_READ_TIMEOUT_MS`). After that the field is dropped and the miss is logged. |
| P3 (8/10) | websiteElitePageSettings.test.js, draft cases | The test repository refuses forbidden calls by throwing, and the service drops the field on any error. A draft path that read through `getCurrentPlan` would still pass tests that only check the result. | Fixed: the draft cases assert that only the current plan is read and that nothing is logged, and a host without a plan row is covered. |
| P3 (9/10) | backend/test/PropertyHandler/support/existingSiteRender.js | `ratePlanRow` was exported in the first commit but not used there. | Fixed: moved to the commit that first uses it. |
| P3 (9/10) | websiteElitePageSettings.js, `hasSitePages` | The array and `typeof` guards are redundant: `Object.hasOwn` already answers false for arrays and strings parsed from JSON, so removing either survives the tests. | Removed in a refactor commit of the next pull request; the null guard stays and is tested. |
| P3 (4/10) | directBookingWebsiteRatePlanService.js, `getWebsiteEntitlements` | A stored plan name such as `constructor` hits an inherited property and throws. The public paths then drop the field; a host read answers 500. | Accepted: the schema allows only `essentials` and `elite`, and the existing plan view behaves the same. |
| P3 (4/10) | directBookingWebsiteRatePlanService.js, `getCurrentPlan` | The branch that expires an ended latest row has no test. It existed before this change; the refactor only moves its date check into `hasPlanEnded`. | Accepted, out of scope. |

## Decisions

- `getCurrentEntitlements` reads only `findCurrentByAccountId`. `getCurrentPlan` and `requireEntitlement` create an Essentials row when none exists, which a public read must not do.
- A row whose end date has passed reads as Essentials even when the database still returns it, so a clock difference between Lambda and database cannot keep Elite.
- `servePageSettingsForHost` returns the same object, before any await, when `sitePages` is absent. Existing sites therefore cost no plan read once the check is wired in.
- The existing-site response is a one-line golden captured from the acceptance code in a test-only first commit. Any change to the public render response must update it in the same commit.

## Not in scope

- Wiring into the render, the preview and the rate plan route: the next pull request on `elite-page-settings-on-render`.
- The static page worker: it renders the published overrides with the frontend renderer, which ignores `sitePages`. A later pull request adds the same check there.

## Mutation check

Run on a copy outside the worktree, one mutant at a time. Caught: check always, every host allowed, allow on a read error, wrong entitlement, strip changes the stored object, draft strips one side only, draft check ignores the published overrides, draft path reads through `getCurrentPlan`, no time limit, a default time limit of 30 seconds, the time limit option ignored, ended plan still counts, read through the inserting plan read, `granted` without the subscription check, `granted` without the plan check, no account guard, no 503 mapping, `effectiveUntil` undefined instead of null, the null guard of `hasSitePages` dropped. Survived: dropping the array or the `typeof` guard of `hasSitePages`, both equivalent, see above.
