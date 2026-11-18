# #3099 Restyle the Elite site pages

Pull requests: four, merged in order: `elite-page-style` (content rules, fonts, pins), `elite-page-accommodation`, `elite-page-details`, `elite-page-gallery-contact`.
Issue: #3099
Reviewed: every commit before it was made, then a second review of each pull request as a whole, then each guard broken on purpose one at a time.
Result: no blocking findings left. 55 mutants, 53 caught. The two left are equivalent: the page check in the template (every page a host can switch on is restyled, which a test pins) and Show all without amenities (it cannot happen while highlights show).

Covers `templates/elite/*`, `panoramaContactContent.js`, the page branch and top bar classes in `PanoramaLandingTemplate.jsx`, `isDescriptionGenerated` on the model, the fonts in `src/fonts`, and their tests.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `eliteSitePage.module.scss` | On phones the page stuck out 4px on both sides: the canvas pads 14px there, the gutter variable stays 18px. | Fixed: -14px below 720px. Measured: page edges at 0 and the viewport width at 390, 600 and 1440px. |
| P2 (9/10) | `eliteSitePageContent.js` | A listing without photos has the placeholder in `galleryImages`, so a gallery slot showed it. | Fixed: every slot is checked against its own image. Tested for 0 to 9 photos. |
| P2 (8/10) | `EliteAccommodationPage.jsx` | With rotation on, the photo row could cycle back to the header photo. | Fixed: the row renders without rotation. Tested. |
| P2 (8/10) | `PanoramaEliteSitePage.jsx` | With the gallery hidden, the host's gallery line still showed. | Fixed and tested. |
| P3 (9/10) | `eliteSitePageContent.js` | "Stay in St. Ives." was cut after "St.". | Fixed: known abbreviations and dotted ones do not end a sentence. Tested, also "Spa." at a sentence end. |
| P3 (8/10) | `ElitePageHeader.jsx` | The gallery line could not be picked in the editor preview. | Fixed: target `gallery.description`. Tested. |
| P3 (7/10) | `eliteSitePage.module.scss` | A long unbroken button label could overflow. | Fixed: the text buttons wrap. |
| P2 (8/10) | `ElitePageHeader.jsx`, photo row | An image that fails to load leaves a broken frame. | Accepted: the shared image component behaves the same on the home page; a fallback there would change existing sites. |
| P2 (8/10) | `prerender/renderStaticSiteContent.js` | Crawlers do not see the Elite pages; site pages have no static page yet. | Accepted for now: the static site pages (planned) must call the same content functions. The home page static HTML is unchanged (golden page, 4103 characters). |
| P3 (7/10) | `panoramaElitePagesPin.test.jsx` | HTML snapshots do not catch visual changes. | Covered by a local pixel comparison: the home page with and without pages is identical before and after at 1440 and 390px. |
| P3 (7/10) | `eliteSitePage.module.scss` | The phone margin repeats the canvas padding of 14px. | Accepted: one shared variable would touch the shared template styles. |
| P4 (8/10) | `PanoramaLandingTemplate.jsx` | The residence title and heading are not shown on the Elite page. | Accepted: the design has none, and the default heading is template copy. |

## Not in scope

- Photo captions, the gallery intro sentence, "3 en-suite" and the date fields of the design: there is no data for them, and no content field is added.
- The existing 4px sideways scroll of the home page on phones: not caused by this change, and the home page must stay as it is.
