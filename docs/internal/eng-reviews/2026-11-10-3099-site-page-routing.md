# #3099 Route site paths to their page on Elite websites

Pull request: (to be opened)
Issue: #3099
Reviewed commits: 3fde6a9c0 (routing pinned before the change), a50ef17fd (anchor scroll helper, no behaviour change), bb9c30d38 (site host paths), c7e70c82f (live view page paths), a536f7667 (availability after Book), 3652dda27 (page titles), 346a5afd4 (encoded live view domain), then a second review of the whole branch, fixed in a9ce9be4f and 6edbaece9
Result: no blocking findings left. Each guard and branch was then broken on purpose, one at a time: 25 of 27 were caught, and the two that were not are equivalent.

Covers the page choice in `WebsitePublicSitePage.jsx`, the live view route `WebsiteLiveSiteRoute.jsx` and its line in `App.js`, the page props and the scroll reveal in `WebsiteTemplatePreview.jsx`, the page links and the scroll to availability in `PanoramaLandingTemplate.jsx`, `isSitePagePath`, `resolveSitePageTitle` and the link search in `websitePages.js`, the page title in `websiteHeadTags.js`, and their tests.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | frontend/web/src/App.js | `/website-live/<domain>/gallery`, `/accommodation` and `/contact-us` showed the not found page. They now show the host's own site, Main when the page is off. Every other sub path still shows the not found page. | Accepted and named in the pull request for confirmation: the dashboard live view, noindex, not linked from anywhere. |
| P2 (9/10) | frontend/web/src/App.js | On a site host, `/website-live/<domain>/<anything>` fell through to the host's own site. The new live view route caught it and showed the not found page or the domain from the path. | Fixed in a9ce9be4f: the sub path route exists only off a site host, and both live routes render the same component. Tested for three sub paths and the live view root on a site host. |
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx | The scroll reveal only ran when the template or the model changed, so the sections of a page the guest moves to stayed hidden. | Fixed in bb9c30d38: the page key is part of the reveal. A test fails without it. |
| P2 (9/10) | frontend/web/src/features/hostdashboard/website/WebsitePublicSitePage.jsx | Page links under the live view without `?siteId=` change the fetch key: the site loads again, and without a site id the render takes the public reachability branch. | Fixed in c7e70c82f: links keep the site id, checked by `buildSitePageHref`. A test counts one fetch on a real history router. |
| P4 (8/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js | Encoded live view sub paths such as `%2F` and `%2Fgallery` decode to `/` and `/gallery` and reached the site. | Fixed in 6edbaece9: only the root or one page slug with an optional trailing slash reaches the site. |
| P3 (7/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx | The scroll to availability depends on the app's scroll to the top running first in the same commit. | Accepted: the routing test asserts the exact order of the two scroll calls through the real `App.js`. |
| P3 (5/10) | frontend/web/src/features/hostdashboard/website/WebsitePublicSitePage.jsx | For one commit after a live view domain change, the previous site renders with the new path. | Accepted: only that site's own public pages, and the window was already there before (head tags guard it). |
| P4 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx | Images that load above availability after the scroll can move it a little. | Accepted, as for the hero call to action today. |
| P4 (6/10) | frontend/web/src/features/hostdashboard/website/rendering/websitePages.js | `resolveSitePageTitle` is a second lookup of the current page next to the template's own. | Accepted: the template also needs Home, the title must not. |
| P4 (9/10) | frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx | The refactor moves the history update before the measuring. | Accepted: a hash-only `replaceState` changes no layout. A test of the call to action passes before and after. |

## Not in scope

- One static page per site page and its title and canonical URL: later pull requests of #3099. The static titles should use `resolveSitePageTitle` and the same form.
- The editor and its preview of pages: the editor pull request.
- The draft preview `/website-preview/<draftId>` passes no page yet, so with pages on its menu links start at the site root. No draft has pages before the editor pull request.
- Checking the plan: the server serves `sitePages` only for hosts with Elite. This pull request adds no plan check.
- The CloudFront function: unchanged. It already answers unknown paths with the app shell.
