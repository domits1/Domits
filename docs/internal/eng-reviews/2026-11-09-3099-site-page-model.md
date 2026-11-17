# #3099 Add the site page model for Elite websites

Pull request: (to be opened)
Issue: #3099
Reviewed commits: b23106523 (page table and rules) and ac7d8372f (template model), then a second review of the whole branch, fixed in 4b6d8c0f6, 910c0ead5 and 297edc1f8
Result: no blocking findings left

Covers `website/rendering/websitePages.js`, the `sitePages` field in `applyWebsiteDraftContentOverrides`, and their tests.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js:154 | `buildSitePageHref` kept a base path with a backslash, tab or newline. Browsers read `/\example.org/gallery` as `//example.org/gallery`, a link to another site. | Fixed in 4b6d8c0f6. A base path is used only when every segment has letters, digits, `_`, `.`, `~`, `%` or `-`; otherwise the link starts at the site root. Tests check the origin of each link. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/tests/websitePages.test.js | The test that keeps the reserved path list in line with `App.js` read only `path="/..."` routes. A route written as `path={...}`, `path='...'`, `path = "..."` or as a relative path would not be seen. | Fixed in b23106523 and 297edc1f8. The test fails unless every `path` attribute in `App.js` is a quoted absolute path it can read, so the list cannot fall behind silently. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js:106 | A menu label of only invisible characters, such as a zero width space, passed and would show as an empty menu link. | Fixed in 910c0ead5. A label needs at least one letter, number, punctuation mark or symbol. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/tests/websitePages.test.js | Some rules had no test of their own: array values in `it.each` were spread as arguments, `<` was only tested together with `>`, direction isolates and marks had no case, and the frozen table, the copy of a page's section list, and `null`, `false` or inherited `sitePages` in the model were not pinned. | Fixed in 297edc1f8. Each guard was then broken on purpose, one at a time, and a test failed for all 59. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:898 | Discard replaces the working content overrides with the published ones, so an unpublished change to `sitePages` is reverted too. | Accepted. That is what discard means for every content field. For a host without pages both sides have no `sitePages`, so nothing changes. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js:319 | Change detection compares the content overrides with `JSON.stringify`, so the order of the fields matters. A stored draft with `sitePages` after the editor's own fields would show pending changes when opened. Nothing in this pull request writes `sitePages`, and a draft saved by the editor reopens without pending changes (tested). | Note for the editor pull request: when it writes `sitePages`, the field order must stay stable, or the comparison must ignore order. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js:94 | The base path rule is ASCII only, so a base built from a decoded non-ASCII domain is dropped and the link starts at the site root. | Note for the routing pull request: build the `/website-live/<domain>` base from encoded segments. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js:112 | The 40 character limit counts code points, so an emoji made of several joined code points counts as several characters. | Accepted. It is stricter than what the guest sees, never looser. |

## Not in scope

- Rendering one page at a time in Panorama, routing paths to pages, the editor controls, one static page per site page and the edge paths: the following pull requests of #3099.
- Host-chosen or translated slugs: the slugs are fixed for the first version, so the slug rules are checked on the page table only.
- Checking the plan: the server removes `sitePages` from the public render and preview for hosts without Elite (the pull request this one merges after).
