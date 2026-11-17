# #3099 Render the Panorama template one page at a time

Pull request: (to be opened)
Issue: #3099
Reviewed commits: 2ae12e9d5 (existing-site golden), 4a4f4c546 (sections per page), 8eb93e8cb (page menu), then a second review of the whole branch, fixed in e6c70bd11 and be6431d32
Result: no blocking findings left. Each guard and branch was then broken on purpose, one at a time, and a test failed for all 36.

Covers the page-aware rendering in `PanoramaLandingTemplate.jsx`, `PanoramaPageHeader.jsx`, `listSitePageMenuItems` in `websitePages.js`, the page header and menu styles, and their tests.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx:1295 | The amenities panel, the gallery browser and the menu drawer stayed open when the page changed without a remount. A gallery browser still loading could open over another page. | Fixed in e6c70bd11. All three close when the page changes. Tested across two quick page changes, with a check that the gallery browser still opens. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/tests/panoramaSitePages.test.jsx | The cases for a malformed `sitePages` and an unusable label went through the content overrides, which normalize first, so the template never saw the raw value. The way back from a page to Main was not tested. | Fixed in be6431d32. Raw model values (text, a list, `enabled` as text, an inherited page, an unusable label) and the return to Main with the quote panel are tested. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaPageHeader.jsx:10 | The page header's room for the top bar had no test. | Fixed in 4a4f4c546, tested with the top bar on and off. |
| P4 (8/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js:149 | `listSitePageMenuItems` repeated the filter of `listEnabledSitePages`. | Fixed in 4a4f4c546. |
| P3 (8/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx:390 | From a page, Book links to Main at `#availability`, but the app scrolls to the top on every path change and nothing scrolls to the hash. Not reachable yet: nothing passes a page to the template. | Note for the routing pull request: scroll to availability after the page change. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx:1425 | A switched-on page whose section is hidden or empty shows only its header. | Accepted: it follows the host's own visibility settings. Note for the editor pull request: warn about it or hide that page. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/tests/panoramaExistingSiteRender.test.jsx:4 | The web test reads the backend golden fixture, so a change to that fixture changes both goldens. | Accepted: one existing site pinned on both the static page and the React render. Both web workflows check out the whole repository. |
| P3 (6/10) | frontend/web/src/features/hostdashboard/website/tests/__snapshots__/panoramaExistingSiteRender.test.jsx.snap | The snapshot also pins generated class names, so an intended Panorama change or a package update needs `npm test -- -u`. | Accepted: that is what the pin is for. Check the difference before updating. |
| P4 (8/10) | frontend/web/src/features/hostdashboard/website/tests/__snapshots__/panoramaExistingSiteRender.test.jsx.snap:1 | The snapshot file starts with a `//` line. | Accepted: Jest writes that header and refuses a snapshot file without it. It is generated, not written by hand. |
| P4 (7/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx:1336 | The panels close in an effect, so one frame can show a panel over the new page. The effect also runs once on mount for every site, with values that do not change. | Accepted. The snapshots of the existing site are unchanged. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx:607 | The drawer still says "Sections" over a menu of pages. | Accepted for the first version. |
| P4 (5/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaPageHeader.jsx:20 | `PropTypes.any` in the ref shape. | Accepted, as in the editor sections. |

## Not in scope

- Choosing the page from the path, passing `activePageKey` and `pageBasePath` through `WebsiteTemplateSurface`, and page titles in the head tags: the routing pull request.
- Showing pages in the editor and leaving `sitePages` out of the editor preview for hosts without Elite: the editor pull request.
- Checking the plan: the server removes `sitePages` from the public render and preview for hosts without Elite. This pull request adds no plan check.
- One static page per site page: later pull requests of #3099.
