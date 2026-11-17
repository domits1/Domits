# #3099 Quote any property of an Elite website

Pull request: `elite-site-properties-quote`, on top of `elite-site-properties-render`.
Issue: #3099
Reviewed: every commit before it was made, then a second review of the pull request as a whole, then each guard broken on purpose one at a time.

## What changed

`POST /property/website/public/quote` takes an optional `propertyId`. The site's own property keeps the path it had. Another property is quoted only when the site serves it, decided on the server by `servesOtherSiteProperty` in `websiteSitePropertySnapshots.js`, which reuses `serveForRender`. The quote itself is the unchanged `WebsiteQuoteService.createQuote` with that property, so its token binds the site and that property.

```
quote ▶ propertyId absent, null or the main id ─▶ the same path as before (no plan read, no snapshot read)
          │ not a non-empty string ─▶ 400 invalid_request, before the site read
          ▼ another id
     site ▶ in published siteProperties? ─no─▶ 404 property_not_found, no read
          ▼ yes
     plan website.multi_property (3 s, fails closed) ─no─▶ 404
          ▼ yes
     serveForRender: snapshots at the site's revision ∥ live host and status (3 s, fails closed) ─not served─▶ 404
          ▼ served
     createQuote(site.id, that property) ▶ token signs both
```

Mutants: 25, all caught. Three first survived and got tests: the plan was not checked to be read for the site's host; a list where one property dropped out while another stayed served; the main property passed to `servesOtherSiteProperty` directly. A 25th, the snapshots read at a fixed revision, was added after the second review and is caught.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `websiteSiteProperties.quote.test.js`, flow | The quote flow repeats most of the editor flow of `websiteSiteProperties.editor.test.js`. | Accepted: the quote flow adds the quote reads and a third property; sharing both flows is a separate refactor. |
| P4 (8/10) | `propertyController.js`, quote log lines | No test checked the quoted property in the log lines of another property's quote. | Fixed: both log lines are asserted. |
| P3 (7/10) | `propertyController.js`, quote events | In one event row, `property_id` is the site's own property and `payload.propertyId` the quoted one. | Accepted: the column keeps the meaning it has for every website event and the booking event. Documented in the handoff. |
| P3 (6/10) | `websiteSitePropertySnapshots.js`, `servesOtherSiteProperty` | The check that the id is listed repeats part of `serveForRender`. | Kept on purpose: an id that is not listed costs no plan read and no database read. Tested. |
| P3 (8/10) | `websiteSitePropertySnapshots.js`, `servesOtherSiteProperty` | Each quote of another property reads the whole snapshot column and the status of every listed property, to answer for one. | Accepted for one quote. For the home search see below. |
| P4 (6/10) | `websiteSitePropertySnapshots.js`, `servesOtherSiteProperty` | Refusing an unlisted id is faster than refusing a listed one that is no longer served, so timing tells whether an id is in the site's published list. | Accepted: it never tells whether a property exists elsewhere, and a property of another host is never read. |

Second review, round one:

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (high) | `propertyController.js`, `createPublicWebsiteQuote` | The property is checked once, before the event write and the quote reads. A republish, a host change, the end of Elite or a deactivation in that window still returns the quote and its token, or 422 `quote_unavailable` instead of 404. | Accepted, not changed. The site's own property has the same window. The token binds a quote, not a booking. The booking request quotes again through this endpoint just before it stores anything (`confirmLivePrice`), so the booking pull request runs the same check again by sending the token's property. A second check after the quote would double the reads and still leave a window. A 422 names a property the guest just saw on this site, so it tells nothing about other hosts. |
| P3 (high) | `support/existingSiteRender.js`, `getPublishedSitePropertySnapshots` | The fake ignored the site id and the revision, and every publish stored revision 1, so the quote tests could not see a read at the wrong revision or a republish during a quote. | Fixed: the fake reads by id and revision, a first publish stores 1 and each republish adds 1, as the repository does. Tested: a quote that started before a republish is refused, the next one quotes. The mutant that reads a fixed revision is caught. |

Second review, round two (on the fix): the fake now matches the repository for a first insert, a republish, a publish that leaves the snapshots alone and the existing site at revision 4. The reasoning for the first point is accepted for a change that only quotes; the booking pull request must send the token's property in its quote. No new findings. The other tests that use the shared fake still test what they did.

## The home search with several properties

API Gateway throttles this route at 10 requests per second with a burst of 20, for all websites together. A home search that sends one quote per property uses up to 12 of them, so two guests at once could slow quotes on other sites. One request that quotes the properties of one site together reads the site, the plan and the snapshots once and uses one request of that limit. That choice belongs to the pull request that adds the date search.

## Not in scope

- Booking requests for the other properties: the next pull request. Bookings still refuse a token whose property is not the site's own.
- The front end: the date search sends `propertyId` in a later pull request.
- Moving the website code in the controller into a business service: a separate refactor.
