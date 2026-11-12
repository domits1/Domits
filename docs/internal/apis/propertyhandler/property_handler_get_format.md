## Get active properties (filtered by type)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byType?type=Boat`
```json
{
    "method": "GET"
}
```

Returns the first 12 properties of that type, in the [order below](#order-and-pagination-of-the-listing-feeds). This route has no pagination.

## Get active properties (not filtered by type)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all`
```json
{
    "method": "GET"
}
```

Returns up to 12 properties and the cursor to continue from:

```json
{
    "properties": [],
    "lastEvaluatedKey": { "createdAt": 1700000000123, "id": "3fe83b04-4a96-4c1e-9d0a-0d1c2e3f4a5b" }
}
```

To get the next page, send the `lastEvaluatedKey` of the previous response back as two query string parameters:

`lastEvaluatedKeyCreatedAt="Number"`.
`lastEvaluatedKeyId="String"`.

Example of a paginated request url:

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=1700000000123&lastEvaluatedKeyId=3fe83b04-4a96-4c1e-9d0a-0d1c2e3f4a5b`

The cursor must come from a previous response. A made-up id, such as `lastEvaluatedKeyId=1`, returns `400`. The order, the cursor and the errors are described under [Order and pagination of the listing feeds](#order-and-pagination-of-the-listing-feeds).

## Get active properties of a country

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byCountry?country=Netherlands`
```json
{
    "method": "GET"
}
```

The response and the pagination parameters are the same as for `all`:

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byCountry?country=Netherlands&lastEvaluatedKeyCreatedAt=1700000000123&lastEvaluatedKeyId=3fe83b04-4a96-4c1e-9d0a-0d1c2e3f4a5b`

The server capitalises the first letter of each word of `country` and lowercases the rest before it matches, so `netherlands` and `Netherlands` return the same properties. The cursor must belong to the country in the same request. Send the cursor of a Netherlands page with `country=Germany` and you get `400`, not a wrong page. When the user searches another country, start again without a cursor.

## Order and pagination of the listing feeds

This applies to `byType` (order only), `all` and `byCountry`.

**Order.** Newly approved listings sit at the bottom, so established listings are not pushed down. A listing's approval time is the time of its latest `APPROVED` moderation event. The sort is, in this order:

1. Oldest approval first. A listing that has never been approved counts as zero, so it comes before every approved one. This is also where every listing from before moderation existed sits.
2. Newest listing first (`createdat`, descending).
3. `id`, descending, to break any remaining tie.

A listing that is approved again gets a new approval time and moves to the bottom. Listings that have never been approved keep the order they had before: newest first.

**Page size.** 12.

**Cursor.** The cursor keeps the shape `{ "createdAt": Number, "id": String }`, but only `id` decides where the next page starts. The server looks the listing with that `id` up and reads its position (approval time, `createdat`, `id`) from the database itself. `createdAt` only marks that a cursor was sent. A stale or invented `createdAt` cannot skip or repeat listings. A request counts as the first page when `lastEvaluatedKeyId` is missing, or when `lastEvaluatedKeyCreatedAt` is missing, not a number, or `0`. The mobile app sends the text `null` for both parameters on the first page; that is page 1.

The lookup ignores the listing's status. If the listing you continue from is archived while the user scrolls, the next page still works.

**Responses.**

| Status | Body | When |
|---|---|---|
| 200 | `{ "properties": [], "lastEvaluatedKey": {} }` | A page, 12 properties or fewer. |
| 400 | `"Unknown pagination cursor."` | The cursor `id` matches no property, or the property was deleted since the previous page. For `byCountry` it also happens when the property is in another country than the one in the request, or moved there since the previous page. |
| 404 | `"No property found."` | No property matches, or there are no more pages. The last page is not marked: ask for the next one and a `404` means the list has ended. |

**What a client should do.** On a `400` for a cursor, start again from the first page without a cursor. On a `404` after at least one page, stop: the list has ended. Because the position is read at request time, a listing that is approved again between two pages moves to the bottom, and a client whose cursor points at it continues from there.

**Known gap.** The filter Lambda (`General-Accommodation-FilterFunction`) walks the `all` feed page by page and does not check the status of the response. A `400` ends its walk silently and it caches an incomplete list for up to 60 seconds. Tracked in [#3890](https://github.com/domits1/Domits/issues/3890).

## Get active properties from a host (filtered by host id)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=123`
```json
{
    "method": "GET"
}
```

## Get active properties (filtered by a set of given property ids (maximum of 12 ids))

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=123,456,789`
```json
{
    "method": "GET"
}
```

## Get active property details (filtered by property id)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=123`
```json
{
    "method": "GET"
}
```

## Get all your own properties (filtered by Authorization header (AccessToken))

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

## Get property details (filtered by property id and Authorization header)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/single?property=123`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

Only the host of the property and the active co-hosts of that host get the property back. A request without a login gets `401`, anyone else gets `403`, a property that does not exist gets `404`, and a request without `property` gets `400`.

## Get all properties of a host (filtered by host id and Authorization header)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/byHostId?hostId=123`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

Co-hosts use this route to load the listings of the host they work for. Only that host and the active co-hosts of that host get the listings back. A request without a login gets `401`, anyone else gets `403`, a request without `hostId` gets `400`, and a host without listings gets `404` with `"No property found."`.