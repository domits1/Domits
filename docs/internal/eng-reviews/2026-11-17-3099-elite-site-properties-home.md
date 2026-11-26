# #3099 Show all properties and the date search on an Elite website

Pull request: `elite-site-properties-home`, after `elite-site-properties-routing`. Issue: #3099
Reviewed: every commit before it was made, a second review of the branch and one more of the fixes, then each guard broken on purpose: 40 of 46 caught. The 6 left change nothing a guest sees: the two aborts the latest-request check makes redundant, the label of a city spelled twice, a malformed date the date inputs cannot produce, one render before a site switch settles, and a day change while the page is open.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (9/10) | `WebsitePublicSitePage.jsx` | On a site with the list the home page has no booking panel, and the property pages get booking in the next pull requests. | Accepted for this step: merge with or after the property page. No site has a list before the editor part. |
| P2 (9/10) | `EliteSitePropertiesHome.jsx` | Site pages missing from the menu; a currency the formatter rejects; a total that is not a number shown as 0; "No property is free" when prices failed; today kept from the first render. | Fixed, each with a test (today: equivalent within one day). |
| P3 (8/10) | `websiteSitePropertySearch.js` | Check-in is compared with the guest's local day; the server uses the UTC day. | Accepted, as in the quote panel of a site with one property. |
| P3 (8/10) | `WebsitePublicSitePage.jsx` | The overview always has the Elite styling and does not look at the template: a site on Experience Journey or Trust Signals with a list would get a home page that differs from its other pages. | Open, from the review of #4034: no site has a list before the editor part, which can keep the list to Panorama sites. |
