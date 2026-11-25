# #3099 Keep the guests of a property stay within the property's capacity

Branch: `elite-site-properties-guest-cap`, from `acceptance`. Issue: #3099. Reviewed before the commit, each guard broken on purpose, then a second review.

`readSitePropertyStayQuery` reads 1 to 99 guests from the address. `buildSitePropertyPage` now passes that stay through `limitSitePropertyStayGuests` with `resolveGuestCapacity` of the property's own model, so the property page, its booking panel, its links and, once the request page is merged, the request page quote and show at most as many guests as the property takes.

| Risk | Where it is closed |
|---|---|
| A capacity of another property | The capacity comes from the model of the property on the path, built from its own snapshot. |
| A property without a known capacity | No limit: the 1 to 99 of the address stays, and the quote refuses what the property does not take, as before. |
| No guests in the address | Left out, as before; the panel takes its default. |

Not closed: the guest is not told that the number was lowered; the page simply shows the lower number. The home search sends its own number to the property page, which is now lowered there too.

With `elite-site-properties-request-page` merged in a throwaway tree, `/properties/<slug>/request?guests=9` quotes 4 guests for a property of 4. Merging both gives a one line conflict in `buildSitePropertyPage`: keep the parameters of the request page and the limited stay of this branch.
