# #3099 Several properties on one Elite website

Pull requests, merged in order: `elite-site-properties-model` (the list in the draft), `elite-site-properties-render` (snapshots at publish, served at render).
Issue: #3099
Reviewed: every commit before it was made, then a second review of each pull request as a whole, then each guard broken on purpose one at a time.

## The list in the draft (`elite-site-properties-model`)

`siteProperties` is a content override: an ordered list of `{ propertyId, slug }` that must hold the main property when it is not empty. Saving cleans the list and checks the host owns every property in it before anything is stored. Publishing checks every property again. The public render serves the list only to hosts with `website.multi_property`, the same way `sitePages` needs `website.unlimited_pages`.

Mutants: 20, all caught.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (8/10) | `propertyController.js`, `publishWebsiteSite` | The owner check runs before the publish transaction, so a property that changes host in between could still be published. | Closed in `elite-site-properties-render`: the publish transaction checks every listed property again with `FOR UPDATE`, so a concurrent change makes the publish fail and retry. |
| P1 (8/10) | `propertyController.js`, draft and site reads | Hosts without Elite get their own `siteProperties` back in their draft and site responses. | Accepted: it is the host's own draft. Only public responses need the plan, and those filter. `sitePages` works the same way. |
| P2 (8/10) | `websiteSiteProperties.js` | An empty list can be saved. | Accepted on purpose: an empty list means one property, the same as no list. A test pins it. |
| P2 (8/10) | `websiteSiteProperties.editor.test.js` | The tests did not check which token reached the owner check, and the draft fake did not keep stored published overrides like the real SQL does. | Fixed: the token is asserted on save and publish, and the fake follows the `COALESCE` of `upsertDraft`. Tested with a save that sends no published overrides. |
| P2 (8/10) | `propertyController.js`, `upsertWebsiteDraft` | The controller calls the draft repository directly. | Not in scope: existing structure, unchanged by this pull request. |
| P2 (7/10) | `propertyController.js`, website errors | A missing main property returns a 500. | Not in scope: existing behaviour. A missing extra property returns a clear 400. |

## Not in scope

- Moving the website code in the controller into a business service: a separate refactor, not mixed with behaviour.
- Saving a list without the plan: allowed, the same as `sitePages`. The plan is checked where the list is served.
