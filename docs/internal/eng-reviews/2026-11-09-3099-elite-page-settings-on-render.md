# #3099 Serve website page settings only to Elite hosts

Issue: #3099
Reviewed: the staged diff of each commit on `elite-page-settings-on-render` after b79a59405, and the whole branch diff before opening
Result: 0 blocking, 4 fixed

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | propertyController.js, render and preview `Promise.all` | Both responses waited for the plan read without a limit, so a read that stalls would end in a gateway timeout for the guest. | Fixed in `elite-page-settings-check` (3 seconds, then the site without page settings) and merged here; render and preview each have a test with a read that never answers. |
| P3 (8/10) | publicWebsiteRender, websitePreview and nonEliteEditor tests | The test repository refuses forbidden calls by throwing, and the public paths drop the field on any error, so tests that only checked the response could not see a forbidden plan read. | Fixed: the Essentials and no-row cases assert that only the current plan is read and that nothing is logged. |
| P3 (9/10) | propertyController.js, `buildPublicDirectBookingWebsiteRenderPayload` | The new default `contentOverrides = site.publishedContentOverrides` was evaluated before the null site guard, so a call with a null site would throw instead of returning null. No caller reached it. | Fixed: `site?.publishedContentOverrides`. |
| P3 (9/10) | websiteElitePageSettings.js, `hasSitePages` | The mutation check showed the array and `typeof` guards were redundant: `Object.hasOwn` already answers false for arrays and strings parsed from JSON. | Fixed in a refactor commit; the null guard stays and is tested. |
| P4 (5/10) | websiteElitePageSettings.js, `hasSitePages` | Replacing `Object.hasOwn` with `in` survives the tests. | Accepted: the overrides come from `JSON.parse`, which creates only own properties. |

## Decisions

- The host whose plan is read comes from the site row (render), the draft row (preview) or the token (`view=entitlements`). Tests pass another host in the query and check it is ignored.
- The plan read runs in the existing `Promise.all` of the render and never rejects, so a failure cannot turn a render into a 500.
- `view=entitlements` is a query parameter on the existing route, so no API Gateway change. Without it the route answers as before, including the Essentials row it creates for a new host.
- Saving and publishing never read the plan, so the editor flow is unchanged and a host whose Elite has ended can still save.

## Not in scope

- The authenticated draft read returns the host's own `sitePages` unfiltered, on purpose, so the editor keeps them. The editor must decide whether to show pages from the entitlements view.
- The static page worker and the sitemap: a later pull request.
- Existing writes on the public paths (analytics events, repairing a missing fallback domain) and existing controller calls to repositories: unchanged.
- `Cache-Control` on the rate plan route: unchanged, same as the plain view. The editor fetches it with `cache: "no-store"`.

## Mutation check

Run on a copy outside the worktree, one mutant at a time, 30 mutants over both pull requests. Caught: the check made to run always (9 tests), every host allowed, allow on a read error, no time limit, render reading the plan of a host given in the request, render ignoring the served overrides, the render default lost, preview answering the stored draft, preview reading the plan of a host given in the request, a draft path reading through `getCurrentPlan`, the entitlements view never taken, always taken, or read for an account given in the request, and every mutant of the read-only check listed in its own record. Survived: `in` instead of `Object.hasOwn`, equivalent, see above.
