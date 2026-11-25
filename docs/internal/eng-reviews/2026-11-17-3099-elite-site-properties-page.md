# #3099 Show one property of an Elite website
Pull request: `elite-site-properties-page`, after `elite-site-properties-home`, built on `elite-site-properties-routing` with `elite-page-gallery-contact` (#3929 to #3931) merged in. Issue: #3099. Reviewed before every commit, then each guard broken on purpose, then two rounds of a second review.

On a Panorama site with a served list of properties, `/properties/<slug>` shows the restyled Elite Accommodation sections of that property, a menu of "Our properties" and the site's Contact page, and a booking panel when the site's quote panel is on.

```
query ─▶ readSitePropertyStayQuery ─▶ panel keyed by property and stay ─▶ POST quote (propertyId only for another property)
answer for another property ─▶ property_not_found; price ─▶ "Request to book" with the answer's stay; any change ─▶ no link
```
| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | `websitePublicQuoteService.js` | A server without the new field quotes the site's own property, so another property would show the main property's price. | Fixed: such an answer is `property_not_found`. |
| P2 (8/10) | `EliteSitePropertyBookingPanel.jsx` | The request link used the input fields while the price shown is the answer's. | Fixed: the link is the answer's stay. |
| P2 (7/10) | second review | The site's own property is not checked against the answer's property. | Kept: without `propertyId` the server quotes only `site.propertyId`, as the home page's panel today. |
| P3 (9/10) | tests | Six guards survived the first mutants. | Fixed: each has a test. |

Mutants: 53, all caught. Second review: round one the three P2 points above and no expiry test (added). Round two: the move test no longer guarded the panel key once the link followed the answer (fixed: it checks the guest field), and a link can stay up to 30 seconds after the price expires, because the shared quote hook checks every 30 seconds as for the home page (kept; the request page quotes again).

Not in scope: the photos page (did not fit under 1000 lines; `/photos`, `/request` and other templates keep the temporary page), static pages per property, the site's own label on the panel button.
