# #3099 Several properties on one Elite website

Pull requests, merged in order: `elite-site-properties-model` (the list in the draft), `elite-site-properties-render` (snapshots at publish, served at render).
Issue: #3099
Reviewed: every commit before it was made, then a second review of each pull request as a whole, then each guard broken on purpose one at a time.

## The list in the draft (`elite-site-properties-model`)

`siteProperties` is a content override: an ordered list of `{ propertyId, slug }` that must hold the main property when it is not empty. Saving cleans the whole list and, before anything is stored, checks that the host owns every property in it that his stored draft does not hold yet. Publishing checks every property again. The public render serves the list only to hosts with `website.multi_property`, the same way `sitePages` needs `website.unlimited_pages`.

Mutants: 20, all caught. The save rule for stored properties: 12 more, all caught. Second review of that rule: no findings. It notes that in this pull request alone the publish still checks every listed property for a host without the plan; `elite-site-properties-render` checks them only with the plan. A stored list that breaks today's list rules is still refused when it is sent back; no client wrote one.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | `propertyController.js`, `upsertWebsiteDraft` | Found while building the editor: every save that sent the list checked every listed property again, also for a host without the plan. The editor sends a stored list back unchanged for such a host, so once a listed listing was deleted or moved to another host he could not save his draft at all (400 or 403), and he has no Properties section to remove it. | Fixed: a save checks existence and owner only of the properties that the host's stored draft row does not hold yet, in its working list or its live list (same `propertyId`; the row is read by property and by the host from the token). The list rules still apply to the whole list, and the publish checks every property. A property removed from both lists is checked again when it comes back. Tested: a deleted and a moved listing without the plan, a property only in the working list or only in the live list, a changed slug, a new property of another host next to stored ones, an older tab, a draft row of another host, a stored list that is not valid. |
| P4 (6/10) | `propertyController.js`, `upsertWebsiteDraft` | A slow save that read the row before another tab removed a property can write that property back without checking it again. | Accepted: it was checked when it was first stored, the publish checks its owner again, and from `elite-site-properties-render` on the publish and the render check host and `ACTIVE` before anything is served. |
| P1 (8/10) | `propertyController.js`, `publishWebsiteSite` | The owner check runs before the publish transaction, so a property that changes host in between could still be published. | Closed in `elite-site-properties-render`: the publish transaction checks every listed property again with `FOR UPDATE`, so a concurrent change makes the publish fail and retry. |
| P1 (8/10) | `propertyController.js`, draft and site reads | Hosts without Elite get their own `siteProperties` back in their draft and site responses. | Accepted: it is the host's own draft. Only public responses need the plan, and those filter. `sitePages` works the same way. |
| P2 (8/10) | `websiteSiteProperties.js` | An empty list can be saved. | Accepted on purpose: an empty list means one property, the same as no list. A test pins it. |
| P2 (8/10) | `websiteSiteProperties.editor.test.js` | The tests did not check which token reached the owner check, and the draft fake did not do what the real query does when a save sends no published overrides. | Fixed: the token is asserted on save and publish. The fake now does what `upsertDraft` does: `COALESCE($8, $6)` in `VALUES` makes the new content overrides the published ones, so `EXCLUDED` is never empty. A first correction kept the stored value instead; the second review of the next pull request caught it. Tested: a save without published overrides publishes the checked content overrides. |
| P2 (8/10) | `propertyController.js`, `upsertWebsiteDraft` | The controller calls the draft repository directly. | Not in scope: existing structure, unchanged by this pull request. |
| P2 (7/10) | `propertyController.js`, website errors | A missing main property returns a 500. | Not in scope: existing behaviour. A missing extra property returns a clear 400. |

## Not in scope

- Moving the website code in the controller into a business service: a separate refactor, not mixed with behaviour.
- Saving a list without the plan: allowed, the same as `sitePages`. The plan is checked where the list is served.
