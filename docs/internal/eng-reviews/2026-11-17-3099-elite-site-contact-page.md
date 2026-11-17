# #3099 Contact page with a property picker on Elite websites

Pull request: `elite-site-contact-page`, after `elite-site-contact-endpoint` in the chain, built on `elite-site-properties-routing`.
Issue: #3099
Reviewed: every commit before it was made, then a second review of the branch and one more of the fixes, then each guard broken on purpose one at a time.

```
render ▶ flag true and sitePages served (website.unlimited_pages, 3 s, fails closed)? ─no─▶ field left out, page as today
          ▼ yes: acceptsContactMessages
Contact us page, not the editor preview ▶ form ▶ POST /property/website/public/contact
  200 SENT ─▶ sent, fields cleared          field or property refused ─▶ next to the field
  known not-sent code (a 503 included), other 4xx ─▶ not sent
  504, unknown 5xx, other 2xx, network, 35 s ─▶ could not confirm (typed text stays while the form is shown)
```

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `EliteContactForm.jsx` | A quick failure re-enabled the button before the second click of a double click. | Fixed: no send within 1 s of an answer. |
| P2 (8/10) | `WebsitePublicSitePage.jsx` | A live update reload unmounts the form and drops what was typed; the message listener checks no origin. | Accepted: the editor announces it to its own live view window; a page that opened a guest's window could send it, but could also navigate that window away. The listener is shared with the live view: its own change. |
| P3 (9/10) | tests | Mutants and both review rounds: a 202 that says SENT, a lost body, a timer left, null overrides, the start and length of the pause, the field next to `siteProperties`, the builder's `null`. | Tested. |
| P3 (9/10) | `PanoramaLandingTemplate.jsx` | After #3931 the mount would sit below the Elite footer. | Moves into `PanoramaEliteSitePage` at that merge. |
| P4 (8/10) | `websiteContactAvailability.js` | The rule follows the served `sitePages` key, equal to the contact route's while its entitlement is `website.unlimited_pages`. | Switch to `websiteContactService.js` after that merge. |
