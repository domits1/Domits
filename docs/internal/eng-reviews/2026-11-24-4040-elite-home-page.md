# #4040 Elite style for the home page of a website with one property

Pull request: `4040-elite-home-page`. Issue: #4040. Builds on the Elite pages of #3929 to #3931.
Reviewed: every commit before it was made, then the whole branch as a reviewer, then each guard broken on purpose: 6 mutants, all caught (no home class, no Elite top bar, the class on every page, a light top bar without a photo, no footer, a footer on every page). After the merge with #4039, 3 more, all caught: the home class and the home footer on `/properties/<slug>`, and a required location in `EliteFooter`.

The home page of the Panorama template (the main page, or the only page of a site without its own pages) gets `panoramaEliteHome` on its `article`, the Elite top bar and the Elite footer. `templates/elite/_eliteHome.scss` restyles the existing sections; the markup, the editor targets, `#availability` and the quote panel stay the same (the five home pins differ from acceptance only by the two classes and the footer). The quote panel and the Panorama calendar read optional theme colours whose fallbacks are today's values.

## What could go wrong, and how it is closed

| Risk | Decision |
|---|---|
| A site on another template | Only `PanoramaLandingTemplate` adds the class; a test renders Trust Signals and Experience Journey without it. |
| A site without photos or a description | The hero keeps its image area and dark overlay, so the top bar stays on the photo tone; tested. |
| The availability section and the live quote | Same section, components and props; the quote and booking tests pass unchanged. |
| The static home page of the worker | It is built from the model, not the template; `checkStaticPageGolden.mjs` still produces the golden page. |
| A site with a list (#4034) | Its home leaves before the template; its render is byte for byte the same on acceptance and this branch. |
| The editor marks the selected card with a shadow | The Elite card rules put the hover and selected marks back, in the accent colour. |
| The property page of #4039 | It renders with the page key `accommodation`, so it gets neither the home class nor a second footer; a test renders `/properties/<slug>` for the site's own property and for another one. |
| A class in `_eliteHome.scss` that the build hashes differently | Every class it uses is defined in `WebsiteTemplatePreview.module.scss` and is set on the page through that module. |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `_eliteHome.scss` | The Elite contact page ignores the host's contact colours. | Kept the host's colours on the home page; only the type is Elite. |
| P3 (9/10) | `PanoramaLandingTemplate.jsx` | #4039 adds an import in the same place. | Resolved in the merge of acceptance: both imports kept, every line of both sides checked, and the pins of both pull requests pass without an update. |

Not in scope: the home page of other templates, the contact colours, and static pages per site page.
