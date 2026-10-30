# #3236 Show the listing in Messages when the host dashboard answers 403

Pull request: #3747
Issue: #3236
Reviewed commit: 173c7d6, each commit reviewed as a staged diff before it was made, and the branch diff reviewed again after the pull request was opened
Result: no blocking findings

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | frontend/web/src/components/messages/BookingTab.jsx:94 | The public listing has no street (`LocationMapping.mapDatabaseEntryToLocation` returns only country and city), so the booking tab showed a house icon with an empty line. | Fixed in f9e5789: the address row is left out without a street. |
| P3 (7/10) | frontend/web/src/components/messages/BookingTab.jsx:27 | When the booking or the listing cannot be loaded, the booking tab renders nothing. In the details panel the listing panel above it shows "Failed to load listing details.", but in the chat's "Reservation details" section the content stays empty. | Accepted for now. It is how every failed load behaves today, and a message there would change the lines #3726 changes. |
| P3 (6/10) | frontend/web/src/components/messages/ListingPanel.jsx:22 | Components still pass the endpoint as a string, and the fallback compares it with `HOST_LISTING_ENDPOINT`. A caller with another string gets no fallback. | Accepted. Both callers pass `hostDashboard/single`, and tests cover both paths. |
| P3 (6/10) | frontend/web/src/components/messages/ListingPanel.jsx:40 | The listing panel and the booking tab fetch the same listing separately, so a thread about a listing the host does not own costs up to four listing requests on desktop. | Accepted. The separate fetches already existed; the fallback only adds one request after a 403. |
| P3 (8/10) | frontend/web/src/components/messages/ListingPanel.jsx:43 | No test covered a late failure or a late finish of the previous thread in the listing panel, an error for the open thread in `useFetchBookingDetails`, or a thread switch between the 403 and the public answer. | Fixed in 173c7d6: tests added, and each guard was broken once to check that a test fails. |
| P3 (7/10) | frontend/web/src/components/messages/BookingTab.jsx:114 | `accommodation?.Capacity` does not exist on either route, so "guests maximum" shows no number. | Not changed here. It is older than this change, and #3726 fixes it. |

## What already exists

- `ListingPanel` already ignored a late answer through its `cancelled` flag. The change adds the same guard to `useFetchBookingDetails`, which had none.
- The public listing page (`features/bookingengine/listingdetails/services/fetchPropertyById.js`) already asks `bookingEngine/listingDetails` without an Authorization header. The fallback asks it the same way.
- Both routes build their answer in `getFullPropertyAttributesInternal`, so the keys match and no mapping helper is needed.

## Failure modes

- /single answers 401, 404, 5xx, or the network fails: no second request, and the panel shows "Failed to load listing details.". Covered by service and panel tests.
- /single answers 403 and the public listing fails too, for example a 404 for an inactive listing: the panel shows "Failed to load listing details." with the title from the thread or "Listing #id". Covered by service and panel tests.
- The host switches threads while the first thread still waits for one or two requests: the late answer or failure is ignored, the open thread keeps loading, and the previous booking and listing are cleared. Covered by hook and panel tests.

## Data flow

```text
ListingPanel                 BookingTab
     |                            ▼
     |                  useFetchBookingDetails
     |                            ▼
     |                    getHostBookingDetails
     ▼                            ▼
        getAccommodationWithPublicFallback
                     ▼
     GET hostDashboard/single (with the access token)
                     ▼
           403? --no--▶ return the listing, or throw
                     |
                    yes
                     ▼
     GET bookingEngine/listingDetails (no Authorization header)
                     ▼
           return the listing, or throw
```

## Not in scope

- The backend check from #3708 is not changed.
- The contact list (`useFetchContacts` through `features/hostdashboard/hostmessages/utils/FetchBookingDetails.js`) still asks `hostDashboard/single` for each thread's photo and title. On a 403 that thread stays without a photo, as before. A fallback there would add a request per thread, so it is left for a follow-up.
- A message of its own in the booking tab when its data fails to load.
