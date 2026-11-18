# #3099 Route the property paths of an Elite website

Pull request: `elite-site-properties-routing`, after `elite-site-properties-booking` in the chain, built on `elite-site-properties-render`.
Issue: #3099
Reviewed: every commit before it was made, then a second review of the branch and one more of the fixes, then each guard broken on purpose one at a time.

`/properties/<slug>`, `/properties/<slug>/photos` and `/properties/<slug>/request` open that property on the host's own domain and in the live view, only when the render answer has `siteProperties`. Until the pages for each kind exist, every kind shows the Panorama Accommodation page of the property, built from its snapshot under the site's own settings, theme and host. A site without the list routes and renders as before; on its own domain a property path still shows the home page, as every unknown path does.

```
"properties/<slug>[/photos|/request]"? ─no─▶ site pages, as before
  │yes   served list of 2+ usable entries? ─no─▶ as before
  ▼                                  │yes
slug served? ─no─▶ not found page    ▼ SITE_PROPERTY_PAGES[kind]
```

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | `websiteSiteProperties.js` | A list of the main property's own keys fails open: a key added later would put the main property's text or photos on every other property. | Fixed: an allow-list of the settings of the whole site. |
| P2 (9/10) | `WebsiteSitePropertyPage.jsx` | On `/photos` and `/request` the current menu entry linked to the property page. | Fixed: it opens its own page kind, as site page entries do. |
| P2 (8/10) | `WebsitePublicSitePage.jsx` | A reload of a not found property path flipped to the loading page and back. | Fixed: the not found page stays until the new answer. |
| P3 (9/10) | tests | Gaps found by the mutants (the head of another property, a check that fails or serves an unusable list) and by the review (the page using the cleaned list). | Fixed: each has a test. |
| P3 (9/10) | live view, sites without the list | A valid property path makes one background render request per address, recorded as a site opened event; screen, title and head stay today's not found page. | Accepted, as for site page paths. Other spellings make no request. |
| P3 (8/10) | `WebsiteSitePropertyPage.jsx` | The temporary page names the property with its hero title (over 40 characters: "Accommodation") and replaces the site's own Accommodation menu entry. Templates without site pages show the property's one-page site. | Accepted until the property page replaces it. |

Mutants: 47 on the final code, 45 caught. Two are equivalent: the quote context of another property (its availability is off, so no quote panel can appear) and the current-request guard on the list (the live view already waits for the current request; on a host's own domain only a `?siteId=` change moves the address, and both show the previous site for the same single render as before).

Second review: round one found the menu link on `/photos` and `/request` (fixed), the long title fallback (accepted above) and three test points (the today's-HTML helper is pinned by the Panorama snapshots; late answers go through the check-and-load code the site page tests cover; the quote guard is the equivalent mutant). Round two on the fixes: no findings. Left as before this change: in the live view a path the check shows as not found does not come back on a live update without a reload, as for site page paths.

Not in scope: static pages and sitemap entries per property (until then the app shell, as `/gallery`), and availability, quote, booking and the page content per kind (later pull requests).
