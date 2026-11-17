# #3099 Show the photos of one property on an Elite website

Pull request: `elite-site-properties-photos`, after `elite-site-properties-page` (it was split from that pull request for size). Issue: #3099. Reviewed before every commit, then each guard broken on purpose, then two rounds of a second review.

On a Panorama site with a served list of properties, `/properties/<slug>/photos` shows the photos of that property, and the property page links it with "View all photos".

```
/properties/<slug>/photos ─▶ served list (MP5) ─▶ SITE_PROPERTY_PAGES.photos ─▶ Panorama: EliteSitePropertyPage (kind photos)
  ─▶ EliteSitePropertyPhotos ─▶ EliteGalleryPage (real photos of media.galleryImages, no rotation) ─▶ "Back to <title>" with the stay
other templates ─▶ the temporary page, as before
```

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | `websiteDraftContentOverrides.js:472` | `media.galleryImages` holds at most six photos (the featured gallery of the model), so the page shows the same photos as the site's `/gallery`. | Kept: the model is shared with existing sites. |
| P3 (6/10) | `WebsitePublicSitePage.jsx:241` | The document title of the photos page is the property title. | Kept: outside this pull request's files. |
| P2 (second review) | `PanoramaLandingTemplate.jsx:1307` | The photo browser clamps against `galleryImages.filter(Boolean)`, so an empty entry would shift the photo opened. | Kept: the model has no empty entries (`buildWebsiteTemplateModel.js:518`, `mergeGalleryImages`); the same handler serves `/gallery`. |
| P2 (second review) | `EliteSitePropertyPage.jsx` | "Our properties" in the breadcrumb does not carry the stay. | Kept: it matches the menu and brand links, and the home page does not read the stay from the URL. |
| P3 (second review) | tests | The rotation test missed hidden rotation layers; no test for a quote running during the move, or for another template on the photos path. | Fixed: every image layer counts; two tests added. |

Mutants: 31 of 31 caught (the rotation only after the test counted every image layer; another template only after the test checked the calendar). Second review: round one the two kept P2 points and the test gaps above; round two on the test fixes, no findings.

Not in scope: captions (no data), every listing photo beyond the six of the model, the document title, the request page (next pull request).
