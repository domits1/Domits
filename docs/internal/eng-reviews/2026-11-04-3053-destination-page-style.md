# #3053 Destination pages look like Domits

Pull request: this one
Issue: #3053
Reviewed commits: 3239ef4ff, 6aa63ee6f, 96af83738, 4d43228a6, 294ac65a4, 1e3cb6704, 5af679b2a, 19d1b3e01, 98ac03c22 and the documentation commit that adds this file, each as a staged diff before its commit, then the whole branch against `acceptance` with a second, independent review
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | backend/functions/PropertyHandler/business/service/destinationPageBuilder.js:81 | The title and place cap was exported, but nothing imported it. | Fixed before 4d43228a6. |
| P3 (7/10) | backend/functions/PropertyHandler/business/service/destinationPageBuilder.js:30 | `isSameSitePath` partly repeats `isDestinationPagePath` in destinationPageRequest.js:9. Reusing it would make an import cycle, because destinationPageRequest.js:2 imports from the builder. | Accepted. The guard reuses `isDestinationSlug` and only decides whether a link stays on the same site, not whether the route serves the page. |
| P3 (6/10) | backend/functions/PropertyHandler/business/service/destinationPageLayout.js:91 | The header loads `/logo.svg` from `frontend/web/public`, another workspace, and no test ties the two together. | Accepted. The image has `alt=""` and the text `Domits` next to it, so a missing file leaves the name without a broken image. |
| P3 (6/10) | backend/functions/PropertyHandler/business/service/destinationPageBuilder.js:95 | A photo on another host than `ACCOMMODATION_IMAGE_BASE_URL` gets the placeholder. If the photos ever move host without this constant, every card falls back to the placeholder. | Accepted. The repository builds the URL from the same constant in util/destination/accommodationImage.js. |
| P3 (5/10) | backend/functions/PropertyHandler/business/service/destinationPageBuilder.js:105 | The photo `alt` repeats the card title that the `h3` in the same link already gives. | Accepted. It was so before, and it names the photo for image search. |
| P3 (5/10) | backend/functions/PropertyHandler/business/service/destinationPageLayout.js:93 | The footer says `Rights reserved, Domits.com` without the year of the app footer. | Accepted, so the page does not depend on the clock. |
| P3 (6/10) | backend/test/PropertyHandler/destinationPageBuilder.test.js | The mutation check found that no test failed without the leading slash check of a destination path. | Fixed in 5af679b2a. |
| P3 (10/10) | backend/test/PropertyHandler/destinationPageLayout.test.js:54 | Second review: the link test read one double quoted URL attribute per tag and the raw text for `javascript:`, so a second `srcset`, a single quoted or unquoted link, or an entity encoded URL passed. | Fixed in 19d1b3e01: every URL attribute in any quote style, no entity but `&amp;`, no whitespace or backslash. Seven such changes now fail the test; all seven passed before. |
| P3 (10/10) | backend/test/PropertyHandler/destinationPageLayout.test.js:104 | Second review: an empty style, or a style with `body{min-width:600px}`, passed the style test. | Fixed in 19d1b3e01: every class used in the pages must have a rule, and no width or minimum width may be fixed above 390 px. |
| P3 (10/10) | backend/test/PropertyHandler/destinationPageLayout.test.js:158 | Second review: the size test did not use the worst case. With only `"` characters a page with 24 stays is 65,569 bytes, above the 64 KiB the test claimed. | Fixed in 19d1b3e01: the test uses only `"` and a bound of 72 KiB. Without the 120 character cap the same page would be about 2.4 MB. |
| P3 (10/10) | backend/test/PropertyHandler/destinationPageLayout.test.js | Second review: the shared layout tests rendered no continent page. | Fixed in 19d1b3e01. |
| P3 (6/10) | docs/internal/tools/destination_pages_runbook.md:164 | The step 7 check told a tester the `404` is not the app shell; with the Domits header and footer it now looks like the app. | Fixed in the documentation commit: the check names the missing `<div id="root">`. |

## Decisions

- Context: the destination pages are plain HTML from `PropertyHandler`, without the app header, footer or styling, and must work without JavaScript for crawlers.
- Options: copy the app's compiled CSS into the pages, link the app stylesheet, or write one small inline style from the app's own values.
- Choice: one shared document shell (`destinationPageLayout.js`) with a static header, footer and one inline style for all six pages, built from the app's real links, labels, colours and the logo at `/logo.svg`. The app stylesheet has a hashed name per build and would add a request, and its CSS is much larger than these pages need.
- Font: no web font. The app body uses the system font stack, and Kanit is only bundled by webpack under a hashed name, so there is no stable URL and no reason for a new request.
- Consequences: links and assets are relative, so a visitor stays on the host they came in on, and the canonical, `og:url` and breadcrumb data keep `https://www.domits.com`. A change to the app header or footer does not reach these pages by itself.

## Not in scope

- The labels of `Product Updates` and `Helpdesk for hosts` in the app footer render empty: frontend/web/src/components/base/Footer.js:47 and :112 read `productUpdates` and `helpDeskForHosts`, while the content files have `producUpdates` and `helpdeskForHosts`. The destination pages use the labels from the content files.
- Wishlist, share and the photo slider of the app cards: they need JavaScript and a signed in visitor.
- A favicon link, `og:image`, and the year in the footer.
