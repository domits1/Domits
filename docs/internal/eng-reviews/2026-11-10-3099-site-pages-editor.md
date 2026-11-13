# #3099 Let Elite hosts switch site pages on in the website editor

Pull request: (to be opened)
Issue: #3099
Reviewed commits: 548b83b9b, 08859a78c, 0089b187c, 5119a430d, 00d41dad0, 860c02195 and this record, each as a staged diff before its commit, then the whole change in a second review
Result: no blocking findings left. Each guard and branch was then broken on purpose, one at a time; a test failed for all 28.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:300 | Applied after the merge, a new `sitePages` came after the managed keys, and a reload put it before them, so an Elite host saw "unsaved changes" after every save. | Fixed before 0089b187c: the page edit is applied to the stored overrides before the merge. Tested: Save is disabled after a save. |
| P2 (8/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:282 | The editor now reads `GET /property/website/rate-plan?view=entitlements` on every load. It only reads once the server change that serves page settings to Elite hosts is deployed; before, the plain view creates an Essentials plan row for a host without one. | Merge order: this pull request merges after that change is deployed. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx:190 | The routing pull request will add `activePageKey` on the same lines. | Same prop name; whichever merges second needs a small merge. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:852 | Page switches changed while a save is running are reset after that save. | Accepted: every editor field behaves like that today, and Save is disabled while saving. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:1123 | Editing the gallery while the preview shows Home highlights nothing, the gallery is on its own page. | Later: switch the preview to the page of the edited field. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/editor/sections/WebsiteEditorPagesSection.jsx | A switched-on page whose section is hidden shows only its title. | Later: a warning in the Pages section. Left out to keep this pull request under 800 lines. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/website/editor/sections/WebsiteEditorPagesSection.jsx:35 | `maxLength` counts UTF-16 units, the page model counts characters, so emoji labels stop at 20. | Accepted: it never produces a label the page model refuses. |

## Second review

Did not fully agree. It named two points as blocking; both were checked in the code and kept, as decisions:

- Page switches changed while a save runs are reset when that save answers (`WebsiteEditorPage.js:852`). The same hydrate resets every other editor field (`setEditorValues` on the next line), so this is the editor's existing save behaviour, not a new one. A different rule for page switches only would break the reset after a discard.
- Discard sends the published content overrides as a whole (`WebsiteEditorPage.js:917`), so for a host without Elite it can replace a `sitePages` stored by hand in the draft. That is the request the editor sends today, which this pull request must keep for hosts without Elite.

Recorded, not changed: drafts written outside the editor whose keys or page fields are in another order can still show "unsaved changes" or "changes not live yet" until the next save; no page test lets a slow plan read answer after the host started editing; Enter in a label field can start a second save like any other field.

## Not in scope

- What the site serves: the server removes `sitePages` for hosts without Elite.
- How a host gets Elite: the editor only reads `website.unlimited_pages` from the entitlements view.
- Page paths on the guest site and in the editor preview links: the routing pull request.
